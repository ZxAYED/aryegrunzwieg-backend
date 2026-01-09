# GIN Indexing and Full-Text Search (FTS) Implementation Example

## 1. Create GIN Index for FTS (Migration or Setup Script)

```typescript
// Example: Create GIN index for Customer table
// Run this once to set up the index (can be in a migration or setup script)

async function createGinIndexForCustomers(prisma: PrismaService) {
  // Create a tsvector column for full-text search (if not exists)
  await prisma.$executeRaw`
    ALTER TABLE "Customer" 
    ADD COLUMN IF NOT EXISTS search_vector tsvector;
  `;

  // Create GIN index on the tsvector column
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS customer_search_gin_idx 
    ON "Customer" 
    USING gin(search_vector);
  `;

  // Create a trigger to automatically update the search_vector
  await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION customer_search_vector_update() 
    RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW."firstName", '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW."lastName", '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW."customerCode", '')), 'B');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  await prisma.$executeRaw`
    DROP TRIGGER IF EXISTS customer_search_vector_trigger ON "Customer";
    CREATE TRIGGER customer_search_vector_trigger
    BEFORE INSERT OR UPDATE ON "Customer"
    FOR EACH ROW
    EXECUTE FUNCTION customer_search_vector_update();
  `;

  // Update existing rows
  await prisma.$executeRaw`
    UPDATE "Customer" 
    SET search_vector = 
      setweight(to_tsvector('english', COALESCE("firstName", '')), 'A') ||
      setweight(to_tsvector('english', COALESCE("lastName", '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(phone, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE("customerCode", '')), 'B');
  `;
}
```

## 2. FTS Query Implementation in Service

```typescript
// Example: customers.service.ts - FTS search method

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // Example 1: Simple FTS query with $queryRaw
  async searchCustomersFTS(searchTerm: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    // Escape special characters for tsquery
    const escapedTerm = searchTerm
      .replace(/[!&|():]/g, '')
      .trim()
      .split(/\s+/)
      .join(' & '); // AND operator between words

    const query = `
      SELECT 
        id,
        "userId",
        "profileImage",
        "customerCode",
        "firstName",
        "lastName",
        email,
        phone,
        status,
        "joinedAt",
        "createdAt",
        "updatedAt",
        ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
      FROM "Customer"
      WHERE search_vector @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, "createdAt" DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM "Customer"
      WHERE search_vector @@ plainto_tsquery('english', $1)
    `;

    const [results, countResult] = await Promise.all([
      this.prisma.$queryRaw`
        ${Prisma.raw(query)}
      ` as Promise<any[]>,
      this.prisma.$queryRaw`
        ${Prisma.raw(countQuery)}
      ` as Promise<{ total: number }[]>,
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: results,
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  // Example 2: FTS with phrase search (exact phrase matching)
  async searchCustomersPhrase(searchTerm: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    // For phrase search, use phraseto_tsquery
    const query = `
      SELECT 
        c.*,
        ts_rank(c.search_vector, phraseto_tsquery('english', $1)) as rank
      FROM "Customer" c
      WHERE c.search_vector @@ phraseto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $2 OFFSET $3
    `;

    const results = await this.prisma.$queryRaw`
      ${Prisma.raw(query)}
    ` as any[];

    return results;
  }

  // Example 3: FTS with prefix matching (starts with)
  async searchCustomersPrefix(searchTerm: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    // Use :* for prefix matching in tsquery
    const prefixTerm = searchTerm.trim().split(/\s+/).join(':* & ') + ':*';
    
    const query = `
      SELECT 
        c.*,
        ts_rank(c.search_vector, to_tsquery('english', $1)) as rank
      FROM "Customer" c
      WHERE c.search_vector @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $2 OFFSET $3
    `;

    const results = await this.prisma.$queryRaw`
      ${Prisma.raw(query)}
    ` as any[];

    return results;
  }

  // Example 4: Combined FTS + Regular Prisma query (hybrid approach)
  async searchCustomersHybrid(searchTerm: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    // First, get IDs from FTS
    const ftsQuery = `
      SELECT id
      FROM "Customer"
      WHERE search_vector @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
      LIMIT 1000
    `;

    const ftsResults = await this.prisma.$queryRaw<{ id: string }[]>`
      ${Prisma.raw(ftsQuery)}
    `;

    const ids = ftsResults.map(r => r.id);

    if (ids.length === 0) {
      return { data: [], meta: { totalItems: 0, totalPages: 0, currentPage: page, itemsPerPage: limit } };
    }

    // Then use Prisma for the rest with the filtered IDs
    const where: Prisma.CustomerWhereInput = {
      id: { in: ids },
      ...(status && { status: status as any }),
    };

    const [totalItems, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }
}
```

## 3. Alternative: Using Generated Column (PostgreSQL 12+)

```typescript
// More modern approach using GENERATED column (PostgreSQL 12+)

async function createGinIndexWithGeneratedColumn(prisma: PrismaService) {
  // Drop old column if exists
  await prisma.$executeRaw`
    ALTER TABLE "Customer" 
    DROP COLUMN IF EXISTS search_vector;
  `;

  // Create generated column
  await prisma.$executeRaw`
    ALTER TABLE "Customer" 
    ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', COALESCE("firstName", '')), 'A') ||
      setweight(to_tsvector('english', COALESCE("lastName", '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(phone, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE("customerCode", '')), 'B')
    ) STORED;
  `;

  // Create GIN index
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS customer_search_gin_idx 
    ON "Customer" 
    USING gin(search_vector);
  `;
}
```

## 4. Usage in Controller

```typescript
// Example: customers.controller.ts

@Get('search')
async searchCustomers(
  @Query('q') searchTerm: string,
  @Query('page') page?: number,
  @Query('limit') limit?: number,
) {
  return this.customersService.searchCustomersFTS(
    searchTerm,
    page || 1,
    limit || 10,
  );
}
```

## 5. Key Points:

- **GIN Index**: Fast for full-text search, supports `@@` operator
- **tsvector**: Stores preprocessed text for fast searching
- **tsquery**: Search query format (plainto_tsquery, phraseto_tsquery, to_tsquery)
- **ts_rank**: Relevance scoring for ranking results
- **Weights**: A (highest), B, C, D (lowest) - used in setweight()
- **Languages**: 'english' removes stop words, you can use other languages

## 6. Query Operators:

- `plainto_tsquery('english', 'john doe')` → 'john' & 'doe' (AND)
- `phraseto_tsquery('english', 'john doe')` → exact phrase
- `to_tsquery('english', 'john & doe')` → explicit AND
- `to_tsquery('english', 'john | doe')` → OR
- `to_tsquery('english', 'john:*')` → prefix match
