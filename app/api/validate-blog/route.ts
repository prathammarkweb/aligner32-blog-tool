import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2025-04';
const SHOPIFY_PRIMARY_DOMAIN = process.env.SHOPIFY_PRIMARY_DOMAIN || 'smilepath.com.au';

async function shopifyGraphQL(query: string, variables?: any) {
  const response = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN || '',
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  return response.json();
}

export async function POST(req: Request) {
  try {
    const { blogUrl } = await req.json();

    if (!blogUrl) {
      return NextResponse.json(
        { error: 'Blog URL is required' },
        { status: 400 }
      );
    }

    // Extract blog handle and article handle from URL
    const urlPattern = /\/blogs\/([^\/]+)\/([^\/\?#]+)/;
    const match = blogUrl.match(urlPattern);

    if (!match) {
      return NextResponse.json(
        { error: 'Invalid blog URL format. Expected: /blogs/blog-handle/article-handle' },
        { status: 400 }
      );
    }

    const blogHandle = match[1];
    const articleHandle = match[2];

    // Function to fetch all articles with pagination
    async function fetchAllArticles(blogId: string, cursor: string | null = null): Promise<any> {
      const query = `
        query {
          blog(id: "${blogId}") {
            articles(first: 250${cursor ? `, after: "${cursor}"` : ''}) {
              edges {
                node {
                  id
                  handle
                  title
                  image {
                    url
                    altText
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `;

      return shopifyGraphQL(query);
    }

    // First, find the blog by handle
    const blogsQuery = `
      query {
        blogs(first: 10, query: "handle:${blogHandle}") {
          edges {
            node {
              id
              handle
            }
          }
        }
      }
    `;

    const blogsData = await shopifyGraphQL(blogsQuery);

    if ((blogsData as any).errors) {
      return NextResponse.json(
        { error: 'Failed to fetch blog data', details: (blogsData as any).errors },
        { status: 500 }
      );
    }

    if (!(blogsData as any).data?.blogs?.edges || (blogsData as any).data.blogs.edges.length === 0) {
      return NextResponse.json(
        { error: 'Blog not found with handle: ' + blogHandle },
        { status: 404 }
      );
    }

    const blogId = (blogsData as any).data.blogs.edges[0].node.id;
    const blogHandleFound = (blogsData as any).data.blogs.edges[0].node.handle;

    // Fetch articles with pagination
    let foundArticle = null;
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage && !foundArticle) {
      const articlesData = await fetchAllArticles(blogId, cursor);

      if ((articlesData as any).errors) {
        return NextResponse.json(
          { error: 'Failed to fetch articles', details: (articlesData as any).errors },
          { status: 500 }
        );
      }

      const articles = (articlesData as any).data?.blog?.articles?.edges || [];
      foundArticle = articles.find((edge: any) => edge.node.handle === articleHandle);

      if (!foundArticle) {
        hasNextPage = (articlesData as any).data?.blog?.articles?.pageInfo?.hasNextPage || false;
        cursor = (articlesData as any).data?.blog?.articles?.pageInfo?.endCursor;
      }
    }

    if (!foundArticle) {
      return NextResponse.json(
        {
          error: 'Article not found',
          message: `Article with handle "${articleHandle}" does not exist in blog "${blogHandle}"`,
        },
        { status: 404 }
      );
    }

    const article = (foundArticle as any).node;
    const onlineStoreUrl = `https://${SHOPIFY_PRIMARY_DOMAIN}/blogs/${blogHandleFound}/${article.handle}`;

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        handle: article.handle,
        title: article.title,
        imageUrl: article.image?.url || null,
        imageAlt: article.image?.altText || article.title,
        url: onlineStoreUrl,
      },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
