const url = process.argv[2];

if (!url) {
  console.error('Usage: node scripts/preview-check.js <preview-url>');
  process.exit(1);
}

async function check(path, expectedTitle) {
  const res = await fetch(url + path);
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}`);
  }
  const text = await res.text();
  if (!text.includes(expectedTitle)) {
    throw new Error(`${path} missing expected title`);
  }
  console.log(`${path} OK`);
}

(async () => {
  try {
    await check('/', 'Daily Intelligence Aggregator');
    await check('/dashboard', 'Daily Intelligence');
    console.log('Preview check passed');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();