const cheerio = require('cheerio');

const createTextLinks = (text) => (text || "").replace(
  /([^\S]|^)(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
  (match, space, url) => {
    let hyperlink = url;
    if (!hyperlink.match('^https?:\/\/')) {
      hyperlink = 'https://' + hyperlink;
    }
    return space + '<a href="' + hyperlink + '" title="' + url + '">' + url + '</a>';
  }
);

const linkRewriter = (config, envelope, node, data, next) => {
  const newTabLink = config.openLinkInNewTab;
  const updatedMail = createTextLinks(data);
  const $ = cheerio.load(updatedMail);

  if (newTabLink) $('a').attr('target', '_blank');

  return next(null, $.html());
}

module.exports = linkRewriter;
