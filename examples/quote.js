import { createHorizonProvider, selectRoute } from '../src/index.js';

const [destinationAsset, sourceAmount = '1'] = process.argv.slice(2);
if (!destinationAsset) throw new Error('Usage: node examples/quote.js CODE:ISSUER [XLM amount]');
const request = { sourceAsset: 'native', destinationAsset, sourceAmount };
const quotes = await createHorizonProvider().quote(request);
console.log(JSON.stringify({ selected: selectRoute(quotes, request), quotes }, null, 2));
