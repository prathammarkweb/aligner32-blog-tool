import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2025-04';

async function shopifyREST(endpoint: string, method: string = 'GET', body: any = null) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN || '',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`,
    options
  );

  return response.json();
}

async function shopifyGraphQL(query: string, variables: any) {
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
  // Check if credentials are provided
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'Missing Shopify credentials in environment variables' },
      { status: 400 }
    );
  }

  try {
    const {
      blogId,
      title,
      body,
      handle,
      image,
      imageAlt,
      pageTitle,
      metaDescription,
      tableOfContents,
      relatedBlogs,
    } = await req.json();

    // Validate required fields
    if (!blogId || !title || !body || !handle) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['blogId', 'title', 'body', 'handle'],
        },
        { status: 400 }
      );
    }

    // Extract numeric blog ID from GID
    const numericBlogId = blogId.split('/').pop();

    // Step 1: Create the article using REST API (allows unpublished articles)
    const articleData = {
      article: {
        title: title,
        author: 'SmilePath Blog Tool',
        body_html: body,
        handle: handle,
        published: false, // THIS CREATES IT AS HIDDEN/UNPUBLISHED
      },
    };

    // Add image if provided
    if (image) {
      (articleData.article as any).image = {
        src: image,
        alt: imageAlt || '',
      };
    }

    console.log('Creating article via REST API:', JSON.stringify(articleData, null, 2));

    const articleResult = await shopifyREST(
      `/blogs/${numericBlogId}/articles.json`,
      'POST',
      articleData
    );

    console.log('Article result:', JSON.stringify(articleResult, null, 2));

    // Check for errors
    if ((articleResult as any).errors) {
      return NextResponse.json(
        {
          error: 'Article creation failed',
          details: (articleResult as any).errors,
        },
        { status: 400 }
      );
    }

    const createdArticle = (articleResult as any).article;

    if (!createdArticle?.id) {
      return NextResponse.json(
        {
          error: 'Article created but no ID returned',
          data: articleResult,
        },
        { status: 500 }
      );
    }

    // Convert numeric ID to GID for metafields
    const articleGid = `gid://shopify/Article/${createdArticle.id}`;

    // Step 2: Add metafields using GraphQL
    const metafields: any[] = [];

    if (pageTitle) {
      metafields.push({
        ownerId: articleGid,
        namespace: 'global',
        key: 'title_tag',
        value: pageTitle,
        type: 'single_line_text_field',
      });
    }

    if (metaDescription) {
      metafields.push({
        ownerId: articleGid,
        namespace: 'global',
        key: 'description_tag',
        value: metaDescription,
        type: 'multi_line_text_field',
      });
    }

    if (tableOfContents) {
      metafields.push({
        ownerId: articleGid,
        namespace: 'custom',
        key: 'table_of_contents',
        value: tableOfContents,
        type: 'multi_line_text_field',
      });
    }

    if (relatedBlogs) {
      metafields.push({
        ownerId: articleGid,
        namespace: 'custom',
        key: 'related_blogs',
        value: relatedBlogs,
        type: 'multi_line_text_field',
      });
    }

    let metafieldsData = null;

    if (metafields.length > 0) {
      const metafieldsMutation = `
        mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      console.log('Setting metafields:', JSON.stringify(metafields, null, 2));

      const metafieldsResult = await shopifyGraphQL(metafieldsMutation, { metafields });

      console.log('Metafields result:', JSON.stringify(metafieldsResult, null, 2));

      if ((metafieldsResult as any).data?.metafieldsSet?.userErrors?.length > 0) {
        console.warn('Metafield errors:', (metafieldsResult as any).data.metafieldsSet.userErrors);
      }

      metafieldsData = (metafieldsResult as any).data?.metafieldsSet?.metafields;
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        message: 'Blog article created successfully as hidden (unpublished)',
        article: {
          id: articleGid,
          numericId: createdArticle.id,
          title: createdArticle.title,
          handle: createdArticle.handle,
          status: createdArticle.published_at ? 'published' : 'hidden',
          publishedAt: createdArticle.published_at,
          image: createdArticle.image,
        },
        metafields: metafieldsData || [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error creating blog article:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
