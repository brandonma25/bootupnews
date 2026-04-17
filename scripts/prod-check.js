const url = process.argv[2];

if (!url) {
  console.error('Usage: node scripts/prod-check.js <production-url>');
  process.exit(1);
}

async function check(path) {
  const res = await fetch(url + path);
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}`);
  }
  console.log(`${path} OK`);
}

(async () => {
  try {
    await check('/');
    await check('/dashboard');
    console.log('Production check passed');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();