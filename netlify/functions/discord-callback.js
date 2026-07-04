// Netlify Function — Discord OAuth callback + role sync
// Runs on Netlify's servers only. Secrets never reach the browser.

exports.handler = async function (event) {
  const code = event.queryStringParameters && event.queryStringParameters.code;

  if (!code) {
    return {
      statusCode: 302,
      headers: { Location: "/?discord_error=missing_code" },
    };
  }

  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = "1503435415569432626"; // Ton serveur Discord (Shinobi no Sekai)

  // Noms exacts des rôles Discord à reconnaître
  const OWNER_ROLE_NAME = "Fondateurs";
  const ADMIN_ROLE_NAME = "⭐・administrateur";
  const HOKAGE_ROLE_NAME = "🍃𝓗𝓸𝓴𝓪𝓰𝓮🔥";
  const MIZUKAGE_ROLE_NAME = "🌊𝓜𝓲𝔃𝓾𝓴𝓪𝓰𝓮💧";
  const AMEKAGE_ROLE_NAME = "🌧️𝓐𝓶𝓮𝓴𝓪𝓰𝓮 ⚡";

  const REDIRECT_URI = `https://${event.headers.host}/.netlify/functions/discord-callback`;

  try {
    // Step 1: exchange the authorization code for an access token
    const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenResp.json();

    if (!tokenData.access_token) {
      return {
        statusCode: 302,
        headers: { Location: "/?discord_error=token_exchange_failed" },
      };
    }

    // Step 2: fetch the Discord user's basic profile
    const userResp = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userResp.json();

    // Step 3: use the BOT token to look up this user's roles on the server
    let roleNames = [];
    let siteRole = "player";
    let kageVillage = "";
    let debugInfo = "";

    if (!BOT_TOKEN) {
      debugInfo = "no_bot_token";
    } else if (!user.id) {
      debugInfo = "no_user_id";
    } else {
      try {
        const memberResp = await fetch(
          `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
          { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );

        if (!memberResp.ok) {
          debugInfo = "member_fetch_failed_" + memberResp.status;
        } else {
          const member = await memberResp.json();
          const roleIds = member.roles || [];

          const rolesResp = await fetch(
            `https://discord.com/api/guilds/${GUILD_ID}/roles`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
          );

          if (!rolesResp.ok) {
            debugInfo = "roles_fetch_failed_" + rolesResp.status;
          } else {
            const allRoles = await rolesResp.json();
            roleNames = allRoles
              .filter((r) => roleIds.includes(r.id))
              .map((r) => r.name);

            if (roleNames.includes(OWNER_ROLE_NAME)) {
              siteRole = "owner";
            } else if (roleNames.includes(ADMIN_ROLE_NAME)) {
              siteRole = "admin";
            }

            if (roleNames.includes(HOKAGE_ROLE_NAME)) {
              kageVillage = "konoha";
            } else if (roleNames.includes(MIZUKAGE_ROLE_NAME)) {
              kageVillage = "kiri";
            } else if (roleNames.includes(AMEKAGE_ROLE_NAME)) {
              kageVillage = "ame";
            }

            debugInfo = "ok_roles_" + encodeURIComponent(roleNames.join(","));
          }
        }
      } catch (e) {
        debugInfo = "exception_" + encodeURIComponent(String(e.message || e));
      }
    }

    // Step 4: redirect back to the site with the Discord profile + computed role
    const params = new URLSearchParams({
      discord_id: user.id || "",
      discord_username: user.username || "",
      discord_avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : "",
      site_role: siteRole,
      kage_village: kageVillage,
    });

    return {
      statusCode: 302,
      headers: { Location: `/?${params.toString()}` },
    };
  } catch (err) {
    return {
      statusCode: 302,
      headers: { Location: "/?discord_error=server_error" },
    };
  }
};
