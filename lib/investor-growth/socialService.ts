export type PublishInvestorGrowthFacebookPostInput = {
  message: string;
};

export type PublishInvestorGrowthFacebookPostResult = {
  postId: string | null;
  provider: "facebook";
  rawResponse: unknown;
};

export function getInvestorGrowthFacebookConfig() {
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim() ?? "";
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ?? "";

  return {
    pageId,
    pageAccessToken,
  };
}

export function hasInvestorGrowthFacebookConfig() {
  const { pageId, pageAccessToken } = getInvestorGrowthFacebookConfig();
  return Boolean(pageId && pageAccessToken);
}

export async function publishInvestorGrowthFacebookPost(
  input: PublishInvestorGrowthFacebookPostInput,
): Promise<PublishInvestorGrowthFacebookPostResult> {
  const { pageId, pageAccessToken } = getInvestorGrowthFacebookConfig();

  if (!pageId || !pageAccessToken) {
    throw new Error(
      "Facebook publishing is not configured. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN.",
    );
  }

  const body = new URLSearchParams({
    message: input.message,
    access_token: pageAccessToken,
  });

  const response = await fetch(`https://graph.facebook.com/v23.0/${pageId}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const rawResponse = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(
      rawResponse.error?.message ||
        "Failed to publish post through Facebook Graph API.",
    );
  }

  return {
    postId: rawResponse.id ?? null,
    provider: "facebook",
    rawResponse,
  };
}
