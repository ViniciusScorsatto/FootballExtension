import crypto from "node:crypto";

const ACCOUNT_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function buildAccountKey(accountId) {
  return `account:profile:${accountId}`;
}

function buildEmailLookupKey(email) {
  return `account:email:${hashValue(normalizeEmail(email))}`;
}

function buildBrowserLinkKey(userId) {
  return `account:browser:${userId}`;
}

function buildMagicLinkKey(token) {
  return `account:magic:${hashValue(token)}`;
}

function createAccountId() {
  return `acct_${crypto.randomUUID()}`;
}

export class AccountService {
  constructor({ cacheService, env }) {
    this.cacheService = cacheService;
    this.env = env;
  }

  async findAccountByEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return null;
    }

    const lookup = await this.cacheService.getJson(buildEmailLookupKey(normalizedEmail));

    if (!lookup?.accountId) {
      return null;
    }

    return this.cacheService.getJson(buildAccountKey(lookup.accountId));
  }

  async findOrCreateAccountByEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return null;
    }

    const existingAccount = await this.findAccountByEmail(normalizedEmail);

    if (existingAccount) {
      return existingAccount;
    }

    const account = {
      accountId: createAccountId(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRestoreRequestedAt: null,
      lastLinkedAt: null
    };

    await Promise.all([
      this.cacheService.setJson(buildAccountKey(account.accountId), account, ACCOUNT_TTL_SECONDS),
      this.cacheService.setJson(
        buildEmailLookupKey(normalizedEmail),
        {
          accountId: account.accountId,
          email: normalizedEmail
        },
        ACCOUNT_TTL_SECONDS
      )
    ]);

    return account;
  }

  async resolveOwnerId(userId) {
    if (!userId || userId === "anonymous") {
      return "";
    }

    const linkedAccount = await this.cacheService.getJson(buildBrowserLinkKey(userId));
    return linkedAccount?.accountId ?? userId;
  }

  async getAccountByUserId(userId) {
    const ownerId = await this.resolveOwnerId(userId);

    if (!ownerId || !ownerId.startsWith("acct_")) {
      return null;
    }

    return this.cacheService.getJson(buildAccountKey(ownerId));
  }

  async linkUserToAccount(userId, accountId) {
    if (!userId || userId === "anonymous" || !accountId) {
      return null;
    }

    const account = await this.cacheService.getJson(buildAccountKey(accountId));

    if (!account) {
      return null;
    }

    const updatedAccount = {
      ...account,
      updatedAt: new Date().toISOString(),
      lastLinkedAt: new Date().toISOString()
    };

    await Promise.all([
      this.cacheService.setJson(buildBrowserLinkKey(userId), { accountId }, ACCOUNT_TTL_SECONDS),
      this.cacheService.setJson(buildAccountKey(accountId), updatedAccount, ACCOUNT_TTL_SECONDS)
    ]);

    return updatedAccount;
  }

  async createMagicLinkRequest({ email, userId }) {
    const account = await this.findOrCreateAccountByEmail(email);
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(
      Date.now() + this.env.authMagicLinkTtlMinutes * 60 * 1000
    ).toISOString();

    await this.cacheService.setJson(
      buildMagicLinkKey(token),
      {
        accountId: account.accountId,
        email: account.email,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt
      },
      this.env.authMagicLinkTtlMinutes * 60
    );

    await this.cacheService.setJson(
      buildAccountKey(account.accountId),
      {
        ...account,
        updatedAt: new Date().toISOString(),
        lastRestoreRequestedAt: new Date().toISOString()
      },
      ACCOUNT_TTL_SECONDS
    );

    return {
      token,
      account,
      expiresAt,
      deliveryMode: this.env.authMagicLinkMode
    };
  }

  async consumeMagicLink(token) {
    const payload = await this.cacheService.getJson(buildMagicLinkKey(token));

    if (!payload?.accountId || !payload?.userId) {
      const error = new Error("Magic link is invalid or expired.");
      error.statusCode = 400;
      error.code = "AUTH_MAGIC_LINK_INVALID";
      error.source = "auth";
      error.recoverable = false;
      throw error;
    }

    const account = await this.linkUserToAccount(payload.userId, payload.accountId);
    await this.cacheService.deleteKey(buildMagicLinkKey(token));

    return {
      account,
      userId: payload.userId
    };
  }
}
