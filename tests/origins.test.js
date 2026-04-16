import assert from "node:assert/strict";
import test from "node:test";
import { createAllowedOrigins, isOriginAllowed } from "../apps/api/src/utils/origins.js";

test("createAllowedOrigins includes explicit origins and chrome extension origins", () => {
  const allowedOrigins = createAllowedOrigins({
    allowedOrigins: ["https://liveimpact.example.com"],
    allowedExtensionIds: ["abcdefghijklmnopabcdefghijklmnop"],
    betaModeEnabled: false,
    nodeEnv: "production"
  });

  assert.deepEqual(allowedOrigins.origins, [
    "https://liveimpact.example.com",
    "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
  ]);
  assert.equal(allowedOrigins.allowAnyExtensionOrigin, false);
});

test("isOriginAllowed permits empty origins and explicit matches", () => {
  const allowedOrigins = [
    "https://liveimpact.example.com",
    "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
  ];

  assert.equal(isOriginAllowed(undefined, allowedOrigins), true);
  assert.equal(isOriginAllowed("https://liveimpact.example.com", allowedOrigins), true);
  assert.equal(
    isOriginAllowed("chrome-extension://abcdefghijklmnopabcdefghijklmnop", allowedOrigins),
    true
  );
  assert.equal(isOriginAllowed("https://evil.example.com", allowedOrigins), false);
});

test("isOriginAllowed permits unpacked chrome extension origins outside production", () => {
  assert.equal(
    isOriginAllowed("chrome-extension://temporaryunpackedextensionid", {
      origins: ["https://liveimpact.example.com"],
      allowAnyExtensionOrigin: true
    }),
    true
  );
});

test("isOriginAllowed still blocks unknown chrome extension origins in production", () => {
  assert.equal(
    isOriginAllowed("chrome-extension://temporaryunpackedextensionid", {
      origins: ["https://liveimpact.example.com"],
      allowAnyExtensionOrigin: false
    }),
    false
  );
});

test("createAllowedOrigins enables unpacked extension origins during beta production", () => {
  const allowedOrigins = createAllowedOrigins({
    allowedOrigins: ["https://footballextension-staging.up.railway.app"],
    allowedExtensionIds: [],
    betaModeEnabled: true,
    nodeEnv: "production"
  });

  assert.equal(allowedOrigins.allowAnyExtensionOrigin, true);
  assert.equal(
    isOriginAllowed("chrome-extension://temporaryunpackedextensionid", allowedOrigins),
    true
  );
});
