const cheerio = require('cheerio');
const { URL } = require('url');
const qs = require('querystring');

const urlEncode = (str) => {
  const encoded = Buffer.from(str).toString('base64')
  return encoded.replace('+', '-').replace('/', '_').replace(/=+$/, '');
};

const urlDecode = (encoded) => {
  sanitizedEncoded = encoded.replace('-', '+').replace('_', '/');
  while (sanitizedEncoded.length % 4)
    sanitizedEncoded += '=';
  return Buffer.from(sanitizedEncoded, 'base64').toString('utf8');
};

// https://ctrlq.org/code/20294-regex-extract-links-javascript
const updateLinksInHTML = (html, manipulate) => {
  const $ = cheerio.load(html);
  const links = $('a');

  let updatedMail = html;
  $(links).each((i, link) => {
    const originalUrl = $(link).attr('href');
    updatedMail = (updatedMail).replace(originalUrl, manipulate(originalUrl));
  });

  return updatedMail;
}

const createPlainMask = (text, manipulate) => (text || "").replace(
  /([^\S]|^)(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
  (match, space, url) => {
    let hyperlink = url;
    if (!hyperlink.match('^https?:\/\/')) {
      hyperlink = 'https://' + hyperlink;
    }
    return space + manipulate(hyperlink);
  }
);

const trackLink = (config, envelope, node, data, next) => {
  const linksProto    = config.trackingProto || 'https';
  const linksHost     = config.trackingHost;
  const linksPath     = config.trackingPath;
  const linksQuery    = config.trackingQuery || 'link';
  const linkTemplate  = config.trackingLinkTemplate;

  const isHtml = node.contentType === 'text/html';
  const isPlainText = node.contentType === 'text/plain';

  const makeLink = (link) => {
    const encodedLink= urlEncode(link);

    const replacements = {
      envelopeId: envelope.id,
      recipientId: urlEncode(envelope.to[0]),
      encodedLink,
    };

    let linksUrl;
    if (linkTemplate) {
      Object.keys(replacements).forEach(key => {
        linksUrl = (linksUrl || linkTemplate).replace(`{${key}}`, replacements[key]);
      });
    } else {
      const url = new URL(linksPath, `${linksProto}://${linksHost}`);
      const queryObject = replacements;

      delete queryObject.encodedLink;

      url.search = qs.stringify({
        ...replacements,
        [linksQuery]: encodedLink,
      });
      linksUrl = url.href;
    };

    return linksUrl;
  };

  let updatedMail;
  if (linksHost || linkTemplate) {
    if (isHtml) {
      updatedMail = updateLinksInHTML(data, makeLink);
    } else if (isPlainText) {
      updatedMail = createPlainMask(data, makeLink);
    }
  }

  return next(null, updatedMail);
}

module.exports = trackLink;
