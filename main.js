const fs = require("fs");
const axios = require("axios");
const readline = require("readline");
const {HttpsProxyAgent} = require("https-proxy-agent");
const colors = require("colors/safe");

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/137.0.0.0 Mobile Safari/537.36",
];
const randomUA = () => userAgents[Math.floor(Math.random() * userAgents.length)];

const buildHeaders = (refCode) => ({
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "trpc-accept": "application/jsonl",
  "x-trpc-source": "nextjs-react",
  "referer": `https://b-ball.fun/invite/${refCode}`,
  "referrer-policy": "strict-origin-when-cross-origin",
  "user-agent": randomUA(),
});

const ask = (q) => new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, (ans) => { rl.close(); res(ans.trim()); });
});

async function run(wallet, proxy, refCode, index) {
  const agent = new HttpsProxyAgent(proxy);
  const base = "https://b-ball.fun/api/trpc";
  const headers = buildHeaders(refCode);

  const prefix = colors.gray(`[${index}]`);

  try {
    console.log(`${prefix} ${colors.yellow("Tạo user...")}`);
    await axios.get(`${base}/user.getOrCreateUser`, {
      params: {
        batch: 1,
        input: JSON.stringify({ 0: { json: { wallet, ref_code: refCode } } }),
      },
      httpsAgent: agent,
      headers,
    });

    console.log(`${prefix} ${colors.yellow("Xác minh nhiệm vụ...")}`);
    await axios.post(`${base}/user.verifyTask?batch=1`, {
      0: { json: { wallet } },
    }, {
      httpsAgent: agent,
      headers: { ...headers, "content-type": "application/json" },
    });

    console.log(`${prefix} ${colors.yellow("Gửi lại thông tin ref...")}`);
    await axios.get(`${base}/user.getOrCreateUser`, {
      params: {
        batch: 1,
        input: JSON.stringify({ 0: { json: { wallet, ref_code: refCode } } }),
      },
      httpsAgent: agent,
      headers,
    });

    console.log(`${prefix} ${colors.yellow("Claim card...")}`);
    await axios.post(`${base}/user.claimCard?batch=1`, {
      0: { json: { wallet, card_id: 1 } },
    }, {
      httpsAgent: agent,
      headers: { ...headers, "content-type": "application/json" },
    });

    console.log(`${prefix} ${colors.green("✅ Thành công")} ${colors.gray(wallet)}\n`);
    return true;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.status || err.message;
    console.log(`${prefix} ${colors.red("❌ Lỗi")} ${wallet}: ${msg}\n`);
    return false;
  }
}

async function main() {
  const refCode = await ask(colors.cyan("📝 Nhập referral code: "));
  const amount = parseInt(await ask(colors.cyan("🔢 Nhập số lượng ví muốn chạy: ")), 10);

  const wallets = fs.readFileSync("wallet.txt", "utf8").trim().split("\n");
  const proxies = fs.readFileSync("proxy.txt", "utf8").trim().split("\n");
  const done = fs.existsSync("done.txt") ? fs.readFileSync("done.txt", "utf8").trim().split("\n") : [];

  let success = 0;

  console.log(colors.bold("\n🚀 Bắt đầu chạy...\n"));

  for (let i = 0, index = 1; i < wallets.length && success < amount; i++) {
    const wallet = wallets[i].trim();
    if (!wallet || done.includes(wallet)) continue;

    const proxy = proxies[i % proxies.length];

    const ok = await run(wallet, proxy, refCode, index);
    if (ok) {
      fs.appendFileSync("done.txt", wallet + "\n");
      success++;
    }

    index++;
    await sleep(3000 + Math.random() * 5000);
  }

  console.log(colors.blueBright(`🎯 Đã hoàn tất ${success} ví\n`));
}

main();
