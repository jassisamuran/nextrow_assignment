const createRule = ({
  id,
  keywords,
  response,
  category,
  exact = false,
}) => {
  const escaped = keywords.join("|");

  return {
    id,
    category,
    response,

    regex: exact
      ? new RegExp(`^(${escaped})[!?., ]*$`, "i")
      : new RegExp(`\\b(${escaped})\\b`, "i"),
  };
};

const RULES = [
  createRule({
    id: "greeting",
    exact: true,
    keywords: [
      "hi",
      "hello",
      "hey",
      "howdy",
      "sup",
      "what'?s up",
    ],
    response:
      "Hello! 👋 I'm your AI support agent. How can I help you today?",
    category: "greeting",
  }),

  createRule({
    id: "goodbye",
    exact: true,
    keywords: [
      "bye",
      "goodbye",
      "see you",
      "take care",
      "cya",
      "later",
    ],
    response:
      "Goodbye! Feel free to come back if you need any more help. 👋",
    category: "farewell",
  }),

  createRule({
    id: "thanks",
    exact: true,
    keywords: [
      "thanks",
      "thank you",
      "thx",
      "ty",
      "cheers",
      "appreciate it",
    ],
    response:
      "You're welcome! Is there anything else I can help you with?",
    category: "courtesy",
  }),

  createRule({
    id: "hours",
    keywords: [
      "hour",
      "hours",
      "open",
      "opening",
      "close",
      "closing",
      "schedule",
      "when are you",
    ],
    response:
      "Our support team is available Monday–Friday, 9 AM – 6 PM (UTC). Outside those hours, this AI agent handles your queries 24/7.",
    category: "faq",
  }),

  createRule({
    id: "pricing",
    keywords: [
      "price",
      "pricing",
      "cost",
      "how much",
      "fee",
      "fees",
      "plan",
      "plans",
      "tier",
    ],
    response:
      "We offer Starter ($0), Pro ($29), and Enterprise plans.",
    category: "faq",
  }),

  createRule({
    id: "refund",
    keywords: [
      "refund",
      "money back",
      "cancel",
      "cancellation",
      "return",
    ],
    response:
      "We offer a 30-day money-back guarantee on all paid plans.",
    category: "faq",
  }),

  createRule({
    id: "password_reset",
    keywords: [
      "password",
      "reset",
      "forgot",
      "can'?t login",
      "login issue",
      "sign in",
    ],
    response:
      "Use the Forgot Password option on the login page to reset your password.",
    category: "faq",
  }),

  createRule({
    id: "contact",
    keywords: [
      "contact",
      "reach",
      "email",
      "phone",
      "speak to",
      "talk to",
      "human",
      "agent",
      "real person",
    ],
    response:
      "Contact us at support@example.com or use live chat.",
    category: "contact",
  }),

  createRule({
    id: "status",
    keywords: [
      "status",
      "outage",
      "down",
      "not working",
      "incident",
      "uptime",
    ],
    response:
      "Check status.example.com for real-time system updates.",
    category: "faq",
  }),
];


function matchRule(input = "") {
  const normalized = input.trim().toLowerCase();

  return RULES.find(rule => rule.regex.test(normalized)) || null;
}

module.exports = {
  RULES,
  matchRule,
};