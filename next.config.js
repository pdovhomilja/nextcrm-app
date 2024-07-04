const withNextIntl = require("next-intl/plugin")(
  "./i18n.ts"
);
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "localhost",
      "res.cloudinary.com",
      "lh3.googleusercontent.com",
      "uploadthing.com",
      "utfs.io",
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname);
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
