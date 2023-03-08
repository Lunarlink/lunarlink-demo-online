/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env:{
    PARTNER_ID : process.env.PARTNER_ID,
    BACKEND_API: process.env.BACKEND_API,
  }
}
