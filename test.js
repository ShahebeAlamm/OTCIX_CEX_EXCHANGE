
// // test.js
// const axios = require("axios");
// const BASE = "http://localhost:3000";

// (async () => {
//   try {
//     console.log("Health:", (await axios.get(BASE + "/api/health").catch(()=>({data:{ok:true}}))).data);

//     // signup/login
//     const user = "tester_" + Date.now();
//     const pass = "pass1234";
//     try { await axios.post(BASE + "/api/signup", { username: user, password: pass }); console.log("signup ok"); } catch (e) { console.log("signup maybe exists"); }
//     const login = await axios.post(BASE + "/api/login", { username: user, password: pass });
//     const token = login.data.token;
//     console.log("token:", token ? token.slice(0,20)+"..." : "no token");

//     // estimate
//     const est = await axios.post(BASE + "/api/estimate", { from: "ETH", to: "BTC", amount: 0.001 });
//     console.log("estimate:", est.data);

//     // place order (test)
//     const order = await axios.post(BASE + "/api/order", { symbol: "ETHBTC", side: "BUY", type: "MARKET", quantity: "0.001" }, { headers: { Authorization: "Bearer " + token }});
//     console.log("order:", order.data);

//     console.log("done");
//   } catch (err) {
//     console.error("test err:", err.response?.data || err.message);
//   }
// })();




