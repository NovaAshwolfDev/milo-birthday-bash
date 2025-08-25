const apiBase = "https://milo-api.onrender.com/api";
const token = localStorage.getItem("token");
const userCache = {};
const socket = io("https://milo-api.onrender.com/", { auth: { token } });

async function loadRooms() {
  const res = await fetch(apiBase + "/rooms", {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });
  const rooms = await res.json();
  const list = document.getElementById("roomsList");
  list.innerHTML = rooms
    .map(
      (r) => `
      <div class="room">
        <strong>${r.title}</strong> (${r.currentViewers}/${r.maxViewers})
        <button onclick="joinRoom('${r._id}')">Join</button>
      </div>
    `
    )
    .join("");
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

async function joinRoom(id) {
  try {
    const res = await fetch(apiBase + "/rooms/" + id + "/join", {
      method: "POST",
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    showNotification("Joined Room!", "success", 3000);
    const result = await res.json();

    alert("Joined room: " + result.title);
  } catch (error) {
    alert(`Error: ${error}`);
  }
}

function parseUsers(userData) {
  console.error(userData);
  return `${JSON.stringify(userData)}`;
}

async function loadPartys() {
  try {
    const [partyRes, meRes] = await Promise.all([
      fetch(apiBase + "/party", {
        headers: { Authorization: "Bearer " + token },
      }),
      fetch(apiBase + "/user/me", {
        headers: { Authorization: "Bearer " + token },
      }),
    ]);

    const partys = await partyRes.json();
    const me = await meRes.json();

    // Cache users
    const allMemberIds = [
      ...new Set(partys.flatMap((p) => p.members.map((m) => m._id))),
    ];
    const usersToFetch = allMemberIds.filter((id) => !userCache[id]);

    await Promise.all(
      usersToFetch.map(async (id) => {
        const res = await fetch(apiBase + "/user/" + id, {
          headers: { Authorization: "Bearer " + token },
        });
        const user = await res.json();
        userCache[id] = user;
      })
    );

    // Render parties
    const list = document.getElementById("partyList");
    list.innerHTML = partys
      .map((p) => {
        const membersHTML = p.members
          .map((m) => {
            const user = userCache[m._id];
            return `
          <div class="member">
            <img src="${
              user.profilePic
                ? apiBase + "/" + user.profilePic.replace(/\\/g, "/")
                : "default.png"
            }" width="30" height="30" />
            <span>${user.displayName || user.username}</span>
            <small>(${user.status})</small>
          </div>
        `;
          })
          .join("");

        const isOwner = me._id === p.owner._id;
        const hasInstance = p.instanceId && p.instanceId !== "";

        return `
        <div class="room">
          <strong>${p.name}</strong> (${p.members.length}/${
          p.maxMembers || "∞"
        })
          <div class="members">${membersHTML}</div>
          <div class="partyButtonsContainer">
            <button class="partyButtons" onclick="joinParty('${
              p._id
            }')">Join</button>
            <button class="partyButtons" onclick="leaveParty('${
              p._id
            }')">Leave</button>
            ${
              isOwner && hasInstance
                ? `<button class="partyButtons" onclick="inviteAll('${p._id}')">Invite All To You</button>`
                : ""
            }
          </div>
        </div><br>
      `;
      })
      .join("");
  } catch (err) {
    showNotification(`Failed to load parties: ${err}`, "error", 5000);
  }
}

function setupPartySockets() {
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    loadPartys(); // initial load
  });
}

async function joinParty(id) {
  try {
    const res = await fetch(apiBase + "/party/" + id + "/join", {
      method: "POST",
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    const result = await res.json();
    showNotification(
      `Successfully Joined ${result.party.owner.displayName}'s Party!`,
      "info",
      10000
    );
    // alert(result.error);
  } catch (error) {
    // alert(`Error: ${error}`);
  }
}

async function leaveParty(id) {
  try {
    const res = await fetch(apiBase + "/party/" + id + "/leave", {
      method: "POST",
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    const result = await res.json();
    showNotification(`Left Party!`, "success", 2000);
  } catch (error) {
    // alert(`Error: ${error}`);
  }
}

async function inviteOne(memberId, partyId) {
  try {
    const res = await fetch(`${apiBase}/party/${partyId}/invite`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberId }),
    });

    const result = await res.json();
    return result;
  } catch (err) {
    console.error(err);
    alert("Failed to send invite 😬");
  }
}

async function inviteAll(partyId) {
  try {
    showNotification(partyId, "info", 5000);
    const res = await fetch(apiBase + "/party/" + partyId + "/invite", {
      method: "POST",
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    const result = await res.json();
    showNotification(
      "Successfully invited all party members!",
      "success",
      5000
    );
    return result;
  } catch (err) {
    console.error(err);
    showNotification("Failed to invite party members: " + err, "error", 4000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  // Login page
  if (path.endsWith("login.html")) {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(loginForm));
        const res = await fetch(apiBase + "/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.token) {
          localStorage.setItem("token", result.token);
          window.location.href = "profile.html";
        } else {
          document.getElementById("loginMsg").innerText =
            result.error || "Login failed";
        }
      });
    }
  }

  if (path.endsWith("signup.html")) {
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(signupForm);
        const res = await fetch(apiBase + "/auth/signup", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (result.token) {
          localStorage.setItem("token", result.token);
          window.location.href = "profile.html";
        } else {
          document.getElementById("signupMsg").innerText =
            result.error || "Signup failed";
        }
      });
    }
  }
  
  // Profile page
  if (path.endsWith("profile.html")) {
    const profileForm = document.getElementById("profileForm");
    const disp = document.getElementById("profilePicPreview");

    if (profileForm) {
      // Load user info
      const loadUser = async () => {
        const res = await fetch(apiBase + "/user/me", {
          headers: { Authorization: "Bearer " + token },
        });
        const user = await res.json();

        profileForm.displayName.value = user.displayName || "";
        profileForm.username.value = user.username || "";
        profileForm.email.value = user.email || "";
        profileForm.status.value = user.status || "";
        profileForm.themeColor.value = user.themeColor || "";
        profileForm.bio.value = user.bio || "";
        profileForm.vrchatId.value = user.vrchatId || "";

        if (user.profilePic) {
          disp.src = `${apiBase}/user/profile-pic?file=${encodeURIComponent(user.profilePic)}&t=${Date.now()}`;
        }
      };

      loadUser();

      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const clickedButton = e.submitter?.name;
        if (clickedButton === "updateBtn") {
          const formData = new FormData(profileForm);
          const res = await fetch(apiBase + "/user/me", {
            method: "PUT",
            headers: { Authorization: "Bearer " + token },
            body: formData,
          });
          const result = await res.json();
          alert("Profile updated!");

          // Update preview immediately, cache-busting
          if (result.profilePic) {
            disp.src = `${apiBase}/user/profile-pic?file=${encodeURIComponent(result.profilePic)}&t=${Date.now()}`;
          }
        }
      });
    }
  }

  // Rooms page
  if (path.endsWith("rooms.html")) {
    loadRooms();

    const createRoomForm = document.getElementById("createRoomForm");
    if (createRoomForm) {
      createRoomForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(createRoomForm));
        await fetch(apiBase + "/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(data),
        });
        loadRooms(); // refresh room list
      });
    }
  }
  if (path.endsWith("party.html")) {
    const createPartyForm = document.getElementById("createPartyForm");
    if (createPartyForm) {
      createPartyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(createPartyForm));
        await fetch(apiBase + "/party", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(data),
        });
        loadPartys(); // refresh party list
      });
    }

    setupPartySockets();
  }

  // Socket.io stuff
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("partyUpdated", () => {
    console.log("Party updated event received");
    if (path.endsWith("party.html")) {
      loadPartys();
    }
  });
});
