const iconv = require('iconv-lite');

const asyncifyStream = (stream, charset) => (
  new Promise((resolve, reject) => {
    let chunks = [];
    let chunklen = 0;
    stream.on('data', chunk => {
      chunks.push(chunk);
      chunklen += chunk.length;
    });

    stream.on('end', () => {
      let data = Buffer.concat(chunks, chunklen);

      if (charset) {
        data = iconv.decode(data, charset);
      } else {
        data = data.toString('binary');
      }

      resolve(data);
    });

    stream.on('error', reject);
  })
);

module.exports = asyncifyStream;
