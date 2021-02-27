export default (res, req) => {
  const origin = req.getHeader("origin");

  res.writeHeader("Access-Control-Allow-Origin", origin);
  res.writeHeader("Access-Control-Allow-Credentials", "true");
};
