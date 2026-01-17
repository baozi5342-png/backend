const API_BASE = "https://backend-slxy.onrender.com";
const ADMIN_KEY = "foxpro_admin_2026";

async function loadUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: {
      "x-admin-key": ADMIN_KEY
    }
  });

  const data = await res.json();
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";

  data.users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.email || "-"}</td>
      <td>${new Date(u.created_at).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadUsers();
