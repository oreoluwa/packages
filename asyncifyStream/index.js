const asyncifyStream = (stream) => (
  new Promise((resolve, reject) => {
    let chunks = [];
    let chunklen = 0;
    stream.on('data', chunk => {
      chunks.push(chunk);
      chunklen += chunk.length;
    });

    stream.on('end', () => {
      const data = Buffer.concat(chunks, chunklen);
      resolve(data);
    });

    stream.on('error', reject);
  })
);

module.exports = asyncifyStream;
