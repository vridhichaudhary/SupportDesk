const BASE_URL = "https://supportdesk-s54j.onrender.com";

export const api = {
  register: async (data) => {
    const res = await fetch(`${BASE_URL}/user/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  login: async (data) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
