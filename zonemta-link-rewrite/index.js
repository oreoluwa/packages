const cheerio = require('cheerio');
const asyncifyStream = require('@oreoluwa/asyncifystream');

// https://ctrlq.org/code/20294-regex-extract-links-javascript
const createTextLinks = (text) => (text || "").replace(
    /([^\S]|^)(((https?\:\/\/)|(www\.))(\S+))/gi,
    (match, space, url) => {
      let hyperlink = url;
      if (!hyperlink.match('^https?:\/\/')) {
        hyperlink = 'https://' + hyperlink;
      }
      return space + '<a href="' + hyperlink + '" title="' + url + '">' + url + '</a>';
    }
  );

const title = 'Track Mail Links Rewrite';

const init = (app, done) => {
  const newTabLink = app.config.openLinkInNewTab;

  app.addRewriteHook(
    (envelope, node) => ['text/html', 'text/plain'].includes(node.contentType),
    async (envelope, node, decoder, encoder) => {
      let html = await asyncifyStream(decoder);

      if (node.charset) {
        html = iconv.decode(html, node.charset);
      } else {
        html = html.toString('binary');
      }
      node.setCharset('utf-8');

      let updatedMail = createTextLinks(html);

      const $ = cheerio.load(updatedMail);

      if (newTabLink) $('a').attr('target', '_blank');

      encoder.end(Buffer.from($.html()));
    }
  );

  done();
};

module.exports = {
  title,
  init,
};
