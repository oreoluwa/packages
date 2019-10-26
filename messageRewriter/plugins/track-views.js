const cheerio = require('cheerio');
const { URL } = require('url');
const qs = require('querystring');

const urlEncode = (str) => {
  const encoded = Buffer.from(str).toString('base64')
  return encoded.replace('+', '-').replace('/', '_').replace(/=+$/, '');
};

const viewTracker = (config, envelope, node, data, next) => {
  const linksProto    = config.pixelProto || 'https';
  const linksHost     = config.pixelHost;
  const linksPath     = config.pixelPath;
  const linkTemplate  = config.pixelUrlTemplate;

  const isHtml = node.contentType === 'text/html';
  const isPlainText = node.contentType === 'text/plain';

  const $ = cheerio.load(data);

  if ( linksHost || linkTemplate ) {
    if (isHtml) {
      let pixelUrl;
      const replacements = {
        envelopeId: envelope.id,
        recipientId: urlEncode(envelope.to[0]),
      };

      if (linkTemplate) {
        Object.keys(replacements).forEach(key => {
          pixelUrl = (pixelUrl || linkTemplate).replace(`{${key}}`, replacements[key]);
        });
      } else {
        const url = new URL(linksPath, `${linksProto}://${linksHost}`);
        url.search = qs.stringify(replacements);
        pixelUrl = url.href;
      }

      let pixelImage = `<img class="link-tracking-open" alt="Open Tracking" width="0" height="0" style="border:0; width:0; height:0;" src="${pixelUrl}">`
      $('body').prepend(pixelImage);
    }
  };

  return next(null, $.html());
}

module.exports = viewTracker;
