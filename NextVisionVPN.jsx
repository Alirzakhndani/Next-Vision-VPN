import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, Zap, Settings, Server, Activity, Globe,
  Lock, Wifi, RefreshCw, Plus, Trash2, Eye, EyeOff,
  Copy, Check, X, ChevronRight, Info, Radio, Power,
  Download, Upload, AlertCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

/* ─── Palette ──────────────────────────────────────────────────────────────── */
const C = {
  bg: "#060c1a",
  sidebar: "rgba(5,8,18,0.97)",
  card: "rgba(255,255,255,0.04)",
  cardH: "rgba(255,255,255,0.07)",
  b: "rgba(255,255,255,0.07)",
  bH: "rgba(255,255,255,0.16)",
  cyan: "#00d4ff",
  violet: "#7c4dfc",
  green: "#0ef0a0",
  red: "#ff4560",
  amber: "#ffb830",
  text: "#cdd8f0",
  muted: "#47537a",
  dim: "#1e2840",
  ca: (a) => `rgba(0,212,255,${a})`,
  va: (a) => `rgba(124,77,252,${a})`,
  ga: (a) => `rgba(14,240,160,${a})`,
  ra: (a) => `rgba(255,69,96,${a})`,
  aa: (a) => `rgba(255,184,48,${a})`,
};

/* ─── Server seed data ─────────────────────────────────────────────────────── */
const SEED = [
  { id:1,  flag:"🇩🇪", country:"Germany",     city:"Frankfurt",  proto:"VMess",       base:30,  port:443,   tls:true,  net:"ws",   uuid:"a3e4b7c2-d819-4f36-8a55-7f924e3c7f92" },
  { id:2,  flag:"🇳🇱", country:"Netherlands", city:"Amsterdam",  proto:"VLess",       base:26,  port:8443,  tls:true,  net:"grpc", uuid:"c7b1d289-3f20-4a16-bc19-ef834a884a88" },
  { id:3,  flag:"🇫🇷", country:"France",      city:"Paris",      proto:"Trojan",      base:36,  port:443,   tls:true,  net:"tcp",  uuid:"9c2ef134-a711-4b08-ba55-3b174e3c3b17" },
  { id:4,  flag:"🇬🇧", country:"UK",          city:"London",     proto:"VLess",       base:43,  port:443,   tls:true,  net:"ws",   uuid:"e5a7c302-6d30-4810-bf19-6d554e6d55" },
  { id:5,  flag:"🇸🇬", country:"Singapore",   city:"Singapore",  proto:"Shadowsocks", base:76,  port:8388,  tls:false, net:"tcp",  uuid:null },
  { id:6,  flag:"🇯🇵", country:"Japan",       city:"Tokyo",      proto:"Trojan",      base:94,  port:443,   tls:true,  net:"tcp",  uuid:"f2d97c45-1b08-4f11-8b55-7f921c1c34" },
  { id:7,  flag:"🇰🇷", country:"S.Korea",     city:"Seoul",      proto:"VMess",       base:86,  port:10086, tls:false, net:"tcp",  uuid:"d4f1b9a0-7b20-4a63-ba19-7a63a17a63" },
  { id:8,  flag:"🇺🇸", country:"USA",         city:"New York",   proto:"VMess",       base:108, port:443,   tls:true,  net:"ws",   uuid:"b8f3a142-9c10-4e21-bf55-9e219e219e21" },
  { id:9,  flag:"🇨🇦", country:"Canada",      city:"Toronto",    proto:"Shadowsocks", base:122, port:8080,  tls:false, net:"tcp",  uuid:null },
  { id:10, flag:"🇦🇺", country:"Australia",   city:"Sydney",     proto:"VLess",       base:143, port:443,   tls:true,  net:"grpc", uuid:"7e3d5f09-4a40-4f09-bf09-5f095f095f09" },
];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const PC = { VMess: C.cyan, VLess: C.violet, Trojan: C.amber, Shadowsocks: C.green, SOCKS5: C.red };
const vpnApi = () => (typeof window !== "undefined" ? window.nextVisionVpn : null);
const makeId = () => Date.now()+Math.floor(Math.random()*100000);
const pingColor = (p) => p < 50 ? C.green : p < 100 ? C.amber : C.red;
const fmtMB = (mb) => mb < 0.001 ? "0 B" : mb < 1 ? (mb*1024).toFixed(0)+" KB" : mb < 1024 ? mb.toFixed(2)+" MB" : (mb/1024).toFixed(3)+" GB";
const fmtTime = (s) => {
  const h = Math.floor(s/3600).toString().padStart(2,"0");
  const m = Math.floor((s%3600)/60).toString().padStart(2,"0");
  const sec = (s%60).toString().padStart(2,"0");
  return `${h}:${m}:${sec}`;
};

const safeB64Decode = (input="") => {
  const normalized = input.trim().replace(/-/g,"+").replace(/_/g,"/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  if (typeof atob !== "function") return padded;
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
const parseHostPort = (url) => ({ address:url.hostname, port:parseInt(url.port||"443",10) });
const protocolName = (name="") => name.toLowerCase()==="vless" ? "VLess" : name.toLowerCase()==="vmess" ? "VMess" : name.toLowerCase()==="ss" ? "Shadowsocks" : name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
const labelParts = (rawLabel, address, proto) => {
  const label = decodeURIComponent(rawLabel||"").replace(/\+/g," ").trim();
  const city = label || address || "Imported Node";
  return { country: city, city, flag: "🌐", proto: protocolName(proto) };
};
const parseVmess = (line) => {
  const data = JSON.parse(safeB64Decode(line.replace(/^vmess:\/\//i,"")));
  const parts = labelParts(data.ps, data.add, "vmess");
  return {
    id:makeId(), ...parts, address:data.add, port:parseInt(data.port||"443",10), uuid:data.id,
    alterId:parseInt(data.aid||"0",10), encryption:data.scy||"auto", net:data.net||"tcp",
    tls:data.tls==="tls", security:data.tls||"", path:data.path||"/", host:data.host||data.sni||"",
    sni:data.sni||data.host||data.add, base:55, ping:55, pingHistory:[55], imported:true, raw:line,
  };
};
const parseShadowsocks = (line) => {
  const bodyWithHash = line.replace(/^ss:\/\//i, "");
  const [bodyAndQuery, rawHash=""] = bodyWithHash.split("#");
  const [body] = bodyAndQuery.split("?");
  let decoded = body;
  let address = "";
  let port = 8388;
  let method = "aes-256-gcm";
  let password = "";

  if (body.includes("@")) {
    const [userinfo, hostPort] = body.split("@");
    const decodedUser = userinfo.includes(":") ? decodeURIComponent(userinfo) : safeB64Decode(userinfo);
    const [parsedMethod, ...passwordParts] = decodedUser.split(":");
    method = parsedMethod || method;
    password = passwordParts.join(":");
    const hp = new URL(`ss://${hostPort}`);
    address = hp.hostname;
    port = parseInt(hp.port||"8388",10);
  } else {
    decoded = safeB64Decode(body);
    const match = decoded.match(/^(.+?):(.+?)@(.+):(\d+)$/);
    if (!match) throw new Error("Invalid Shadowsocks link format.");
    [, method, password, address, port] = match;
    port = parseInt(port,10);
  }

  const parts = labelParts(rawHash, address, "ss");
  return { id:makeId(), ...parts, address, port, password, method, net:"tcp", tls:false, base:60, ping:60, pingHistory:[60], imported:true, raw:line };
};
const parseLink = (line) => {
  if (/^vmess:\/\//i.test(line)) return parseVmess(line);
  if (/^ss:\/\//i.test(line)) return parseShadowsocks(line);
  const url = new URL(line);
  const proto = url.protocol.replace(":","").toLowerCase();
  if (!["vless","trojan"].includes(proto)) throw new Error(`Unsupported link protocol: ${proto}`);
  const username = decodeURIComponent(url.username||"");
  const hp = parseHostPort(url);
  const security = url.searchParams.get("security") || (proto === "trojan" ? "tls" : "");
  const parts = labelParts(url.hash.replace(/^#/,""), hp.address, proto);
  return {
    id:makeId(), ...parts, ...hp,
    uuid: proto === "vless" ? username : undefined,
    password: proto === "trojan" ? username : undefined,
    net:url.searchParams.get("type")||url.searchParams.get("network")||"tcp",
    tls:["tls","reality"].includes(security) || proto === "trojan",
    security,
    path:url.searchParams.get("path")||"/", host:url.searchParams.get("host")||"",
    sni:url.searchParams.get("sni")||url.searchParams.get("serverName")||url.hostname,
    serviceName:url.searchParams.get("serviceName")||"", flow:url.searchParams.get("flow")||"none",
    publicKey:url.searchParams.get("pbk")||"", shortId:url.searchParams.get("sid")||"",
    fingerprint:url.searchParams.get("fp")||"chrome", spiderX:url.searchParams.get("spx")||"",
    base:60, ping:60, pingHistory:[60], imported:true, raw:line,
  };
};
const parseConfigInput = (text) => {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Paste at least one V2Ray link or JSON config.");
  if (trimmed.startsWith("{")) {
    const json = JSON.parse(trimmed);
    const outbound = json.outbounds?.find(o=>["vmess","vless","trojan","shadowsocks"].includes(o.protocol)) || json.outbounds?.[0];
    if (!outbound) throw new Error("JSON does not contain a supported outbound.");
    const vnext = outbound.settings?.vnext?.[0];
    const ss = outbound.settings?.servers?.[0];
    const user = vnext?.users?.[0] || {};
    const proto = protocolName(outbound.protocol);
    const address = vnext?.address || ss?.address;
    const stream = outbound.streamSettings || {};
    return [{
      id:makeId(), ...labelParts(outbound.tag, address, outbound.protocol), proto,
      address, port:vnext?.port || ss?.port, uuid:user.id, password:ss?.password, method:ss?.method,
      alterId:user.alterId||0, encryption:user.security||user.encryption||"auto", flow:user.flow||"none",
      net:stream.network||"tcp", tls:["tls","reality"].includes(stream.security), security:stream.security||"",
      path:stream.wsSettings?.path || stream.httpSettings?.path || "/",
      host:stream.wsSettings?.headers?.Host || stream.tlsSettings?.serverName || "",
      sni:stream.tlsSettings?.serverName || address, serviceName:stream.grpcSettings?.serviceName || "",
      base:65, ping:65, pingHistory:[65], imported:true, raw:trimmed,
    }];
  }
  return trimmed.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).map(parseLink);
};
const loadSavedServers = () => {
  try {
    if (typeof localStorage === "undefined") return null;
    return JSON.parse(localStorage.getItem("nextVisionServers")||"null") || null;
  } catch { return null; }
};


/* ─── Sparkline ────────────────────────────────────────────────────────────── */
function Sparkline({ history, color, w=52, h=22 }) {
  const d = (history||[]).slice(-24);
  if (d.length < 2) return <span style={{color:C.muted,fontSize:10}}>···</span>;
  const mx = Math.max(...d), mn = Math.min(...d), rng = mx-mn||1;
  const pts = d.map((v,i)=>`${(i/(d.length-1))*w},${h-((v-mn)/rng)*(h-3)-1}`).join(" ");
  return (
    <svg width={w} height={h} style={{overflow:"visible",flexShrink:0}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
    </svg>
  );
}

/* ─── macOS Title Bar ──────────────────────────────────────────────────────── */
function TitleBar({ connected }) {
  return (
    <div style={{
      height:44, background:"rgba(5,8,18,0.98)", backdropFilter:"blur(30px)",
      borderBottom:`1px solid ${C.b}`, display:"flex", alignItems:"center",
      padding:"0 18px", flexShrink:0, position:"relative", zIndex:200,
      WebkitAppRegion:"drag",
    }}>
      <div style={{display:"flex",gap:7,alignItems:"center",WebkitAppRegion:"no-drag"}}>
        {[["#ff5f56","#e0443e"],["#ffbd2e","#dfa123"],["#27c93f","#1aab29"]].map(([bg,sh],i)=>(
          <div key={i} style={{
            width:13,height:13,borderRadius:"50%",background:bg,cursor:"default",
            boxShadow:`0 0 0 0.5px ${sh}`,transition:"filter 0.15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.15)"}
          onMouseLeave={e=>e.currentTarget.style.filter="brightness(1)"}
          />
        ))}
      </div>
      <div style={{
        position:"absolute",left:"50%",transform:"translateX(-50%)",
        display:"flex",alignItems:"center",gap:9,
        fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12.5,
        color:C.text,letterSpacing:1.8,userSelect:"none",
      }}>
        <Shield size={12} color={connected?C.green:C.muted} style={{transition:"color 0.5s"}} />
        NEXT VISION VPN
        <span style={{
          fontSize:8.5,padding:"2px 7px",borderRadius:10,letterSpacing:1.5,
          background:connected?C.ga(0.13):C.ra(0.12),
          color:connected?C.green:C.red,
          border:`1px solid ${connected?C.ga(0.28):C.ra(0.28)}`,
          fontFamily:"'JetBrains Mono',monospace",
          transition:"all 0.5s",
        }}>{connected?"● SECURE":"○ OFFLINE"}</span>
      </div>
      <div style={{marginLeft:"auto",fontSize:10,color:C.muted,fontFamily:"'JetBrains Mono',monospace",userSelect:"none"}}>
        v2.5.1
      </div>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */
function Sidebar({ view, setView, connected, autoConnect }) {
  const items = [
    {id:"dashboard",Icon:Activity,  label:"Dashboard"},
    {id:"servers",  Icon:Server,    label:"Servers"},
    {id:"settings", Icon:Settings,  label:"Settings"},
  ];
  const [hov, setHov] = useState(null);
  return (
    <div style={{
      width:62,background:C.sidebar,borderRight:`1px solid ${C.b}`,
      display:"flex",flexDirection:"column",alignItems:"center",
      paddingTop:14,paddingBottom:16,gap:3,flexShrink:0,
    }}>
      <div style={{
        width:36,height:36,borderRadius:10,marginBottom:18,
        background:`linear-gradient(135deg,${C.ca(0.25)},${C.va(0.35)})`,
        border:`1px solid ${C.ca(0.3)}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        boxShadow:`0 0 20px ${C.ca(0.18)}`,
      }}>
        <Shield size={17} color={C.cyan} />
      </div>
      {items.map(({id,Icon,label})=>{
        const active = view===id;
        return (
          <button key={id} onClick={()=>setView(id)} title={label}
            onMouseEnter={()=>setHov(id)} onMouseLeave={()=>setHov(null)}
            style={{
              width:42,height:42,borderRadius:11,border:"none",cursor:"pointer",
              background:active?C.ca(0.12):hov===id?C.card:"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              position:"relative",transition:"all 0.18s ease",outline:"none",
            }}>
            <Icon size={17} color={active?C.cyan:C.muted} style={{transition:"color 0.2s"}} />
            {active && <div style={{
              position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",
              width:3,height:22,borderRadius:"0 2px 2px 0",
              background:C.cyan,boxShadow:`0 0 8px ${C.cyan}`,
            }} />}
          </button>
        );
      })}
      <div style={{marginTop:"auto",display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
        {autoConnect && (
          <div title="Auto-connect ON" style={{
            width:7,height:7,borderRadius:"50%",background:C.amber,
            boxShadow:`0 0 6px ${C.amber}`,marginBottom:2,
          }} />
        )}
        <div style={{
          width:8,height:8,borderRadius:"50%",
          background:connected?C.green:C.red,
          boxShadow:connected?`0 0 10px ${C.green}`:"none",
          transition:"all 0.5s",
        }} />
        <span style={{fontSize:8,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>
          {connected?"ON":"OFF"}
        </span>
      </div>
    </div>
  );
}

/* ─── Connection Orb ───────────────────────────────────────────────────────── */
function ConnectionOrb({ connected, connecting }) {
  return (
    <div style={{width:190,height:190,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <div style={{
        position:"absolute",inset:0,borderRadius:"50%",
        background:connected?`radial-gradient(circle,${C.ca(0.18)} 0%,transparent 70%)`
          :`radial-gradient(circle,rgba(30,40,70,0.25) 0%,transparent 70%)`,
        transition:"background 1.2s ease",
      }} />
      {[
        {size:164,borderStyle:`1px solid ${connected?C.ca(0.38):"rgba(50,65,110,0.28)"}`,anim:"ring1 9s linear infinite",dot:{size:7,color:C.cyan,pos:{top:-3.5,left:"calc(50% - 3.5px)"}}},
        {size:126,borderStyle:`1px solid ${connected?C.va(0.42):"rgba(50,65,110,0.2)"}`,anim:"ring2 6.5s linear infinite reverse",dot:{size:6,color:C.violet,pos:{bottom:-3,left:"calc(50% - 3px)"}}},
        {size:96, borderStyle:`1px dashed ${connected?C.ga(0.32):"rgba(50,65,110,0.15)"}`,anim:"ring3 13s linear infinite",dot:null},
      ].map((r,i)=>(
        <div key={i} style={{
          position:"absolute",width:r.size,height:r.size,
          borderRadius:"50%",border:r.borderStyle,
          animation:r.anim,transformStyle:"preserve-3d",transition:"border 1s ease",
        }}>
          {r.dot && <div style={{
            position:"absolute",...r.dot.pos,
            width:r.dot.size,height:r.dot.size,borderRadius:"50%",
            background:r.dot.color,
            boxShadow:connected?`0 0 10px ${r.dot.color},0 0 20px ${r.dot.color}40`:"none",
            transition:"all 1s ease",
          }} />}
        </div>
      ))}
      <div style={{
        width:70,height:70,borderRadius:"50%",zIndex:2,position:"relative",
        background:connecting
          ?`conic-gradient(${C.cyan},${C.violet},${C.green},${C.cyan})`
          :connected
            ?`radial-gradient(circle at 36% 30%,${C.ca(1)},#0055bb 50%,#001535 100%)`
            :`radial-gradient(circle at 36% 30%,#455070,#18213a 50%,#080d1c 100%)`,
        boxShadow:connecting
          ?`0 0 35px ${C.ca(0.65)}`
          :connected
            ?`0 0 28px ${C.ca(0.48)},0 0 60px ${C.ca(0.18)},inset 0 0 28px ${C.ca(0.12)}`
            :`0 0 18px rgba(0,0,0,0.6)`,
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"background 1s ease, box-shadow 1s ease",
        animation:connecting?"spin 1.2s linear infinite":"none",
      }}>
        {connecting
          ? <RefreshCw size={26} color="white" style={{animation:"spin 0.9s linear infinite"}} />
          : <Shield size={28} color={connected?"white":C.muted} style={{transition:"color 0.8s"}} />
        }
      </div>
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, Icon, color }) {
  return (
    <div style={{
      background:C.card,borderRadius:13,border:`1px solid ${C.b}`,
      padding:"13px 15px",flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:5,
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:9.5,color:C.muted,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.2}}>
          {label}
        </span>
        {Icon && <Icon size={12} color={color||C.muted} />}
      </div>
      <div style={{
        fontSize:17,fontWeight:700,color:color||C.text,
        fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.5,
        textShadow:color?`0 0 14px ${color}40`:"none",transition:"all 0.3s",
      }}>
        {value}
      </div>
      {sub && <div style={{fontSize:10,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{sub}</div>}
    </div>
  );
}

/* ─── Dashboard View ───────────────────────────────────────────────────────── */
function DashboardView({ connected, connecting, activeServer, speedData, totalDown, totalUp, publicIP, elapsed, handleConnect, fastestServer, statusMessage, errorMessage }) {
  const spd = speedData.length ? speedData[speedData.length-1] : {down:0,up:0};
  return (
    <div style={{padding:"26px 26px",display:"flex",flexDirection:"column",gap:18,animation:"fadeIn 0.3s ease"}}>
      {/* Hero */}
      <div style={{
        background:`linear-gradient(135deg,${C.ca(0.04)},${C.va(0.06)})`,
        border:`1px solid ${C.b}`,borderRadius:20,padding:"26px 28px",
        display:"flex",alignItems:"center",gap:28,position:"relative",overflow:"hidden",
      }}>
        <div style={{
          position:"absolute",right:0,top:0,bottom:0,width:"35%",
          background:`linear-gradient(to left,${C.va(0.05)},transparent)`,pointerEvents:"none",
        }} />
        <div style={{
          position:"absolute",bottom:-40,right:-40,width:180,height:180,borderRadius:"50%",
          background:`radial-gradient(circle,${C.ca(0.06)},transparent 70%)`,pointerEvents:"none",
        }} />
        <ConnectionOrb connected={connected} connecting={connecting} />
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:13}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:C.text,marginBottom:5,letterSpacing:-0.3}}>
              {connecting ? "Connecting…" : connected ? "Connection Secured" : "Not Protected"}
            </div>
            <div style={{fontSize:12.5,color:C.muted}}>
              {connected
                ? `${activeServer?.proto||"—"} · ${activeServer?.net?.toUpperCase()||"—"} · ${activeServer?.flag||""} ${activeServer?.city||"—"}`
                : statusMessage || "Your traffic is exposed — connect to a V2Ray/Xray server to secure it"
              }
            </div>
          </div>
          <div style={{
            display:"flex",alignItems:"center",gap:8,width:"fit-content",
            background:"rgba(255,255,255,0.04)",borderRadius:9,
            border:`1px solid ${C.b}`,padding:"7px 12px",
          }}>
            <Globe size={12} color={C.muted} />
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:connected?C.text:C.muted,transition:"color 0.5s"}}>
              {publicIP}
            </span>
            {connected && (
              <span style={{
                fontSize:8.5,padding:"1.5px 6px",borderRadius:4,
                background:C.ga(0.13),color:C.green,
                fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,
                border:`1px solid ${C.ga(0.25)}`,
              }}>MASKED</span>
            )}
          </div>
          <button onClick={() => handleConnect(connected ? activeServer?.id : fastestServer?.id)} disabled={connecting || (!connected && !fastestServer)}
            style={{
              width:"fit-content",padding:"10px 22px",borderRadius:11,border:"none",
              cursor:connecting?"not-allowed":"pointer",
              background:connected?C.ra(0.13):`linear-gradient(135deg,${C.cyan},${C.violet})`,
              color:connected?C.red:"white",fontSize:13,fontWeight:600,letterSpacing:0.4,
              transition:"all 0.2s ease",opacity:connecting?0.65:1,
              boxShadow:connected?"none":`0 4px 22px ${C.ca(0.28)}`,
              fontFamily:"'DM Sans',sans-serif",
            }}
            onMouseEnter={e=>{if(!connecting)e.currentTarget.style.transform="translateY(-1.5px) scale(1.02)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";}}
          >
            {connecting?"⟳  Starting core…":connected?"⏻  Disconnect":"⚡  Quick Connect"}
          </button>
        </div>
        {errorMessage && (
          <div style={{
            display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",borderRadius:10,
            background:C.ra(0.1),border:`1px solid ${C.ra(0.25)}`,color:C.red,fontSize:11.5,
            fontFamily:"'DM Sans',sans-serif",maxWidth:520,
          }}>
            <AlertCircle size={14} style={{flexShrink:0,marginTop:1}} />
            <span>{errorMessage}</span>
          </div>
        )}
        {connected && (
          <div style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            padding:"13px 16px",background:"rgba(255,255,255,0.04)",
            borderRadius:13,border:`1px solid ${C.b}`,minWidth:78,flexShrink:0,
          }}>
            <span style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>PING</span>
            <span style={{
              fontSize:26,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",
              color:pingColor(activeServer?.ping||99),
              textShadow:`0 0 12px ${pingColor(activeServer?.ping||99)}`,
              lineHeight:1,transition:"color 0.3s",
            }}>{activeServer?.ping||"—"}</span>
            <span style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>ms</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:11}}>
        <StatCard label="Download" value={`${spd.down?.toFixed(1)||"0.0"} Mb/s`} sub={`↓ ${fmtMB(totalDown)}`} Icon={Download} color={C.cyan} />
        <StatCard label="Upload" value={`${spd.up?.toFixed(1)||"0.0"} Mb/s`} sub={`↑ ${fmtMB(totalUp)}`} Icon={Upload} color={C.violet} />
        <StatCard label="Protocol" value={activeServer?.proto||"—"}
          sub={activeServer?`${activeServer.net?.toUpperCase()} · ${activeServer.tls?"TLS":"RAW"}`:"No server"}
          Icon={Lock} color={activeServer?PC[activeServer.proto]:C.muted} />
        <StatCard label="Session" value={connected?fmtTime(elapsed):"—"} sub={connected?"Active":"Disconnected"} Icon={Activity} color={connected?C.green:C.muted} />
      </div>

      {/* Speed Chart */}
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.b}`,padding:"16px 20px 6px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:connected?C.green:C.muted,
            boxShadow:connected?`0 0 6px ${C.green}`:"none",transition:"all 0.5s"}} />
          <span style={{fontSize:10,color:C.muted,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.1}}>
            Live Speed
          </span>
          <span style={{marginLeft:"auto",fontSize:10,color:C.muted,display:"flex",gap:14}}>
            <span style={{color:C.cyan}}>↓ Download</span>
            <span style={{color:C.violet}}>↑ Upload</span>
          </span>
        </div>
        <ResponsiveContainer width="100%" height={112}>
          <AreaChart data={speedData} margin={{top:4,right:0,bottom:0,left:0}}>
            <defs>
              <linearGradient id="dG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.cyan} stopOpacity={0.22}/>
                <stop offset="95%" stopColor={C.cyan} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="uG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.violet} stopOpacity={0.22}/>
                <stop offset="95%" stopColor={C.violet} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis hide /><YAxis hide />
            <Tooltip contentStyle={{
              background:"rgba(8,12,26,0.92)",border:`1px solid ${C.b}`,
              borderRadius:9,fontSize:11,color:C.text,
              fontFamily:"'JetBrains Mono',monospace",
            }}
            formatter={(v,n)=>[`${(v||0).toFixed(1)} Mb/s`,n==="down"?"Download":"Upload"]}
            labelFormatter={()=>""} />
            <Area type="monotone" dataKey="down" stroke={C.cyan} strokeWidth={2}
              fill="url(#dG)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="up" stroke={C.violet} strokeWidth={1.5}
              fill="url(#uG)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Server Row ───────────────────────────────────────────────────────────── */
function ServerRow({ srv, active, connected, connecting, handleConnect, rank }) {
  const [hov, setHov] = useState(false);
  const isConn = active && connected;
  const col = pingColor(srv.ping);
  const pc = PC[srv.proto]||C.cyan;

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:"flex",alignItems:"center",gap:13,padding:"9px 15px",
        borderRadius:11,cursor:"pointer",transition:"all 0.15s ease",
        background:isConn?C.ca(0.08):hov?C.cardH:"transparent",
        border:`1px solid ${isConn?C.ca(0.22):hov?C.b:"transparent"}`,
      }}
      onClick={()=>handleConnect(srv.id)}>
      <div style={{
        width:22,fontSize:10,color:rank===1?C.amber:rank<=3?C.muted:"rgba(71,83,122,0.6)",
        fontFamily:"'JetBrains Mono',monospace",textAlign:"center",flexShrink:0,fontWeight:rank===1?700:400,
      }}>{rank===1?"★":`#${rank}`}</div>
      <span style={{fontSize:19,flexShrink:0}}>{srv.flag}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:500,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{srv.country}</div>
        <div style={{fontSize:10.5,color:C.muted}}>{srv.city}</div>
      </div>
      <div style={{
        padding:"2px 8px",borderRadius:6,flexShrink:0,fontSize:9.5,
        fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.4,
        background:`${pc}18`,color:pc,border:`1px solid ${pc}28`,
      }}>{srv.proto}</div>
      <div style={{flexShrink:0}}>
        <Sparkline history={srv.pingHistory||[srv.ping]} color={col} />
      </div>
      <div style={{
        width:65,textAlign:"right",flexShrink:0,fontFamily:"'JetBrains Mono',monospace",
        fontSize:13,fontWeight:600,color:col,
        textShadow:`0 0 10px ${col}`,transition:"color 0.3s",
      }}>{srv.ping} ms</div>
      <button onClick={e=>{e.stopPropagation();handleConnect(srv.id);}}
        style={{
          padding:"5px 13px",borderRadius:8,border:`1px solid ${isConn?C.ra(0.3):hov?C.ca(0.3):C.b}`,
          cursor:"pointer",flexShrink:0,fontSize:11,fontWeight:600,
          background:isConn?C.ra(0.13):hov?C.ca(0.12):"transparent",
          color:isConn?C.red:hov?C.cyan:C.muted,
          transition:"all 0.15s ease",fontFamily:"'DM Sans',sans-serif",
        }}>
        {isConn?"Disconnect":connecting&&active?"···":"Connect"}
      </button>
    </div>
  );
}

/* ─── Servers View ─────────────────────────────────────────────────────────── */
function ServersView({ servers, activeServerId, connected, connecting, handleConnect, openImport }) {
  const [q, setQ] = useState("");
  const filtered = servers.filter(s=>!q||[s.country,s.city,s.proto].some(v=>v.toLowerCase().includes(q.toLowerCase())));
  return (
    <div style={{padding:"22px 24px",display:"flex",flexDirection:"column",gap:16,animation:"fadeIn 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:C.text}}>Server Nodes</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
            {servers.length} configs · Supports VMess, VLess, Trojan, Shadowsocks · Xray/V2Ray PC core
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${C.b}`,borderRadius:9,padding:"6px 12px"}}>
          <Globe size={12} color={C.muted}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…"
            style={{background:"transparent",border:"none",outline:"none",color:C.text,fontSize:12,width:110,fontFamily:"'DM Sans',sans-serif"}} />
          {q && <button onClick={()=>setQ("")} style={{background:"transparent",border:"none",cursor:"pointer",color:C.muted,padding:0,display:"flex"}}><X size={12}/></button>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:C.green,fontFamily:"'JetBrains Mono',monospace"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`,animation:"blink 1.2s ease-in-out infinite"}} />
          LIVE
        </div>
      </div>
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.b}`,overflow:"hidden"}}>
        <div style={{
          display:"flex",alignItems:"center",gap:13,padding:"8px 15px",
          borderBottom:`1px solid ${C.b}`,background:"rgba(255,255,255,0.02)",
          fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.2,
        }}>
          <div style={{width:22}}>#</div>
          <div style={{width:28}}>FLAG</div>
          <div style={{flex:1}}>LOCATION</div>
          <div style={{width:88}}>PROTOCOL</div>
          <div style={{width:52}}>TREND</div>
          <div style={{width:65,textAlign:"right"}}>PING</div>
          <div style={{width:85,textAlign:"center"}}>ACTION</div>
        </div>
        <div style={{padding:7,display:"flex",flexDirection:"column",gap:2}}>
          {filtered.map((s,i)=>(
            <ServerRow key={s.id} srv={s} active={s.id===activeServerId} connected={connected}
              connecting={connecting} handleConnect={handleConnect} rank={i+1} />
          ))}
          {!filtered.length && <div style={{textAlign:"center",padding:"32px",color:C.muted,fontSize:13}}>No servers found.</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:9}}>
        <button style={{
          display:"flex",alignItems:"center",gap:7,padding:"9px 16px",borderRadius:10,
          border:`1px dashed ${C.b}`,background:"transparent",color:C.muted,cursor:"pointer",
          fontSize:11.5,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",
        }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ca(0.4);e.currentTarget.style.color=C.cyan;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b;e.currentTarget.style.color=C.muted;}}
        onClick={openImport}><Plus size={13}/>Add Config</button>
      </div>
    </div>
  );
}

/* ─── Settings View ────────────────────────────────────────────────────────── */
function SettingsView({ settings, setSettings, addServers, initialTab="general" }) {
  const [tab, setTab] = useState(initialTab);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const upd = useCallback((k,v)=>setSettings(p=>({...p,[k]:v})),[setSettings]);
  useEffect(()=>setTab(initialTab),[initialTab]);
  const doImport = useCallback(()=>{
    try {
      const parsed = parseConfigInput(importText);
      addServers(parsed);
      setImportMsg(`Imported ${parsed.length} config${parsed.length===1?"":"s"}.`);
      setImportText("");
    } catch (error) {
      setImportMsg(error.message);
    }
  },[importText, addServers]);

  const Toggle = ({label,desc,k})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",borderBottom:`1px solid ${C.b}`}}>
      <div>
        <div style={{fontSize:13,color:C.text,fontWeight:500}}>{label}</div>
        {desc&&<div style={{fontSize:11,color:C.muted,marginTop:2.5}}>{desc}</div>}
      </div>
      <div onClick={()=>upd(k,!settings[k])} style={{
        width:46,height:25,borderRadius:13,cursor:"pointer",flexShrink:0,
        background:settings[k]?`linear-gradient(135deg,${C.cyan},${C.violet})`:"rgba(255,255,255,0.09)",
        position:"relative",transition:"all 0.25s ease",
        boxShadow:settings[k]?`0 0 12px ${C.ca(0.38)}`:"none",
      }}>
        <div style={{
          position:"absolute",top:2.5,left:settings[k]?23:2.5,
          width:20,height:20,borderRadius:"50%",background:"white",
          transition:"left 0.22s ease",boxShadow:"0 1px 5px rgba(0,0,0,0.35)",
        }}/>
      </div>
    </div>
  );

  const Field = ({label,k,type="text",placeholder=""})=>(
    <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.b}`}}>
      <div style={{fontSize:9.5,color:C.muted,marginBottom:6,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.1}}>{label}</div>
      <input type={type} value={settings[k]||""} placeholder={placeholder}
        onChange={e=>upd(k,type==="number"?parseInt(e.target.value)||0:e.target.value)}
        style={{
          width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.b}`,
          borderRadius:9,padding:"8px 12px",color:C.text,fontSize:12,outline:"none",
          fontFamily:"'JetBrains Mono',monospace",transition:"border-color 0.2s",
        }}
        onFocus={e=>e.target.style.borderColor=C.ca(0.5)}
        onBlur={e=>e.target.style.borderColor=C.b}
      />
    </div>
  );

  const Sel = ({label,k,opts})=>(
    <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.b}`}}>
      <div style={{fontSize:9.5,color:C.muted,marginBottom:6,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.1}}>{label}</div>
      <select value={settings[k]} onChange={e=>upd(k,e.target.value)}
        style={{
          width:"100%",background:"rgba(8,12,26,0.97)",border:`1px solid ${C.b}`,
          borderRadius:9,padding:"8px 12px",color:C.text,fontSize:12,outline:"none",
          fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",
        }}>
        {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  const tabs = [{id:"general",label:"General"},{id:"protocol",label:"Protocol"},{id:"advanced",label:"Advanced"},{id:"import",label:"Import Config"}];

  return (
    <div style={{padding:"22px 24px",display:"flex",flexDirection:"column",gap:16,animation:"fadeIn 0.3s ease"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:C.text}}>Settings</div>
      <div style={{display:"flex",gap:4,padding:4,background:C.card,borderRadius:12,border:`1px solid ${C.b}`,width:"fit-content"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"6px 16px",borderRadius:9,border:`1px solid ${tab===t.id?C.ca(0.25):"transparent"}`,
            cursor:"pointer",background:tab===t.id?C.ca(0.11):"transparent",
            color:tab===t.id?C.cyan:C.muted,fontSize:12,fontWeight:500,letterSpacing:0.2,
            transition:"all 0.18s ease",fontFamily:"'DM Sans',sans-serif",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.b}`,overflow:"hidden"}}>
        {tab==="general"&&<>
          <Toggle label="Auto-Connect to Fastest" desc="Automatically switch to lowest-ping server every 200ms test cycle" k="autoConnect"/>
          <Toggle label="Kill Switch" desc="Block all internet traffic if VPN connection drops unexpectedly" k="killSwitch"/>
          <Toggle label="DNS Leak Protection" desc="Force all DNS queries through the encrypted tunnel" k="dnsLeak"/>
          <Toggle label="Smart Routing (Split Tunnel)" desc="Route only non-local traffic through the VPN" k="smartRoute"/>
          <Toggle label="Auto-start on Boot" desc="Launch Next Vision VPN when system starts" k="autoStart"/>
        </>}
        {tab==="protocol"&&<>
          <Sel label="Protocol" k="protocol" opts={[["VMess","VMess"],["VLess","VLess"],["Trojan","Trojan"],["Shadowsocks","Shadowsocks"],["SOCKS5","SOCKS5"]]}/>
          <Sel label="Transport Network" k="network" opts={[["ws","WebSocket (WS)"],["tcp","TCP"],["grpc","gRPC"],["h2","HTTP/2 (H2)"],["quic","QUIC"]]}/>
          <Toggle label="TLS Encryption" desc="Enable TLS/SSL on the transport layer" k="tls"/>
          <Field label="Server Port" k="port" type="number" placeholder="443"/>
          <Field label="UUID / Password" k="uuid" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/>
          {(settings.protocol==="VMess"||settings.protocol==="VLess")&&
            <Sel label="Encryption" k="encryption" opts={[["auto","Auto"],["aes-128-gcm","AES-128-GCM"],["chacha20-poly1305","ChaCha20-Poly1305"],["none","None"]]}/>}
          {settings.protocol==="VLess"&&
            <Sel label="Flow Control (XTLS)" k="flow" opts={[["none","None"],["xtls-rprx-direct","XTLS Direct"],["xtls-rprx-vision","XTLS Vision"]]}/>}
          {settings.protocol==="Shadowsocks"&&
            <Sel label="Cipher Method" k="method" opts={[["aes-256-gcm","AES-256-GCM"],["chacha20-poly1305","ChaCha20-Poly1305"],["aes-128-gcm","AES-128-GCM"]]}/>}
          {settings.network==="ws"&&<>
            <Field label="WebSocket Path" k="path" placeholder="/ray"/>
            <Field label="WebSocket Host Header" k="host" placeholder="cdn.example.com"/>
          </>}
          {settings.network==="grpc"&&
            <Field label="gRPC Service Name" k="grpcService" placeholder="GunService"/>}
        </>}
        {tab==="advanced"&&<>
          <Toggle label="Mux / Multiplexing" desc="Multiplex multiple connections over a single TCP tunnel" k="mux"/>
          {settings.mux&&<Field label="Mux Concurrency" k="muxConcurrency" type="number" placeholder="8"/>}
          <Toggle label="Sniffing" desc="Detect traffic type for smarter routing decisions" k="sniff"/>
          <Sel label="DNS Server" k="dns" opts={[["1.1.1.1","Cloudflare (1.1.1.1)"],["8.8.8.8","Google (8.8.8.8)"],["9.9.9.9","Quad9 (9.9.9.9)"],["223.5.5.5","AliDNS (223.5.5.5)"]]}/>
          <Sel label="Routing Rule" k="routing" opts={[["bypass-iran","Bypass Iran IPs"],["bypass-cn","Bypass China IPs"],["global","Global — Route Everything"],["direct","Direct — No Proxy"]]}/>
          <Field label="Log Level" k="logLevel" placeholder="warning"/>
        </>}
        {tab==="import"&&(
          <div style={{padding:"18px"}}>
            <div style={{fontSize:9.5,color:C.muted,marginBottom:8,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.1}}>
              Paste V2Ray Config Link or JSON
            </div>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder={`vmess://eyJhZGQiOiJleGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6Ii4uLiJ9\n— or —\nvless://uuid@host:port?type=ws&security=tls&path=%2Fray#Label\n— or —\ntrojan://password@host:443?security=tls#Label\n— or —\nss://BASE64@host:port#Label`}
              style={{
                width:"100%",height:190,resize:"vertical",
                background:"rgba(255,255,255,0.03)",border:`1px solid ${C.b}`,
                borderRadius:10,padding:"12px",color:C.text,fontSize:11,
                fontFamily:"'JetBrains Mono',monospace",outline:"none",lineHeight:1.7,
              }}
              onFocus={e=>e.target.style.borderColor=C.ca(0.45)}
              onBlur={e=>e.target.style.borderColor=C.b}
            />
            <div style={{display:"flex",gap:9,marginTop:14}}>
              <button style={{
                padding:"9px 20px",borderRadius:9,border:"none",cursor:"pointer",
                background:`linear-gradient(135deg,${C.cyan},${C.violet})`,
                color:"white",fontSize:12,fontWeight:600,
                boxShadow:`0 4px 14px ${C.ca(0.28)}`,fontFamily:"'DM Sans',sans-serif",
              }} onClick={doImport}>Import</button>
              <button style={{
                padding:"9px 20px",borderRadius:9,border:`1px solid ${C.b}`,
                cursor:"pointer",background:"transparent",color:C.muted,fontSize:12,
                fontFamily:"'DM Sans',sans-serif",
              }}>📷  Scan QR</button>
              <button style={{
                padding:"9px 20px",borderRadius:9,border:`1px solid ${C.b}`,
                cursor:"pointer",background:"transparent",color:C.muted,fontSize:12,
                fontFamily:"'DM Sans',sans-serif",
              }} onClick={()=>setImportMsg("Use paste import for this build, or import files from your Electron shell integration later.")}>📂  Open File</button>
            </div>
            {importMsg && <div style={{marginTop:12,fontSize:11,color:importMsg.startsWith("Imported")?C.green:C.amber,fontFamily:"'JetBrains Mono',monospace"}}>{importMsg}</div>}
            <div style={{marginTop:14,padding:"12px",borderRadius:10,background:C.ca(0.055),border:`1px solid ${C.ca(0.16)}`,fontSize:11,color:C.text,lineHeight:1.6}}>
              PC mode starts a local SOCKS proxy on <b>127.0.0.1:{settings.socksPort}</b> and HTTP proxy on <b>127.0.0.1:{settings.httpPort}</b>. Install Xray/V2Ray in PATH or set <b>NEXTVISION_CORE_PATH</b>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Root App ─────────────────────────────────────────────────────────────── */
export default function NextVisionVPN() {
  const [view, setView]                 = useState("dashboard");
  const [connected, setConnected]       = useState(false);
  const [connecting, setConnecting]     = useState(false);
  const [activeId, setActiveId]         = useState(null);
  const [settingsTab, setSettingsTab]   = useState("general");
  const [servers, setServers]           = useState(()=>loadSavedServers() || []);
  const [speedData, setSpeedData]       = useState(Array.from({length:32},(_,i)=>({t:i,down:0,up:0})));
  const [totalDown, setTotalDown]       = useState(0);
  const [totalUp, setTotalUp]           = useState(0);
  const [publicIP, setPublicIP]         = useState("—");
  const [elapsed, setElapsed]           = useState(0);
  const [statusMessage, setStatusMessage] = useState(vpnApi()?"Ready for PC tunnel mode":"Preview mode: run inside Electron to start Xray/V2Ray core");
  const [errorMessage, setErrorMessage] = useState("");
  const connectedAtRef                  = useRef(null);
  const [settings, setSettings]         = useState({
    autoConnect:true, killSwitch:true, dnsLeak:true, smartRoute:false, autoStart:false,
    mux:false, muxConcurrency:8, sniff:true,
    protocol:"VMess", network:"ws", tls:true, port:443,
    uuid:"a3e4b7c2-d819-4f36-8a55-7f924e3c7f92",
    path:"/ray", host:"cdn.cloudflare.com", grpcService:"GunService",
    encryption:"auto", flow:"none", method:"aes-256-gcm",
    dns:"1.1.1.1", routing:"bypass-iran", logLevel:"warning", socksPort:10808, httpPort:10809,
  });

  const addServers = useCallback((items)=>{
    setServers(prev=>{
      const merged = [...items, ...prev];
      if (typeof localStorage !== "undefined") localStorage.setItem("nextVisionServers", JSON.stringify(merged));
      return merged;
    });
    setView("servers");
  },[]);

  /* Font + keyframes injection */
  useEffect(()=>{
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      *{box-sizing:border-box;}
      html,body,#root{margin:0;width:100%;height:100%;background:#060c1a;overflow:hidden;}
      body{font-family:'DM Sans',sans-serif;}
      ::-webkit-scrollbar{width:3px;height:3px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.09);border-radius:2px;}
      @keyframes ring1{from{transform:rotateX(70deg) rotateZ(0deg);}to{transform:rotateX(70deg) rotateZ(360deg);}}
      @keyframes ring2{from{transform:rotateX(52deg) rotateZ(120deg);}to{transform:rotateX(52deg) rotateZ(-240deg);}}
      @keyframes ring3{from{transform:rotateX(82deg) rotateZ(-55deg);}to{transform:rotateX(82deg) rotateZ(305deg);}}
      @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:translateY(0);}}
      @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.35;}}
    `;
    document.head.appendChild(style);
    return ()=>{
      try{document.head.removeChild(link);}catch(e){}
      try{document.head.removeChild(style);}catch(e){}
    };
  },[]);

  /* Ping test — every 200ms */
  useEffect(()=>{
    const tid = setInterval(()=>{
      setServers(prev=>{
        const updated = prev.map(s=>{
          const jitter = (Math.random()-0.5)*30;
          const wave = Math.sin(Date.now()/(1800+s.id*350))*14;
          const np = Math.max(5,Math.min(499,Math.round(s.base+jitter+wave)));
          return {...s,ping:np,pingHistory:[...(s.pingHistory||[s.base]).slice(-23),np]};
        });
        return updated;
      });
    },200);
    return ()=>clearInterval(tid);
  },[]);

  /* Auto-switch to fastest */
  useEffect(()=>{
    if(!settings.autoConnect||!connected||connecting) return;
    if(vpnApi()) return; // Avoid switching UI without restarting the real desktop core.
    const sorted = [...servers].sort((a,b)=>a.ping-b.ping);
    const fastest = sorted[0];
    if(fastest && fastest.id!==activeId){
      const curPing = servers.find(s=>s.id===activeId)?.ping||999;
      if(fastest.ping < curPing*0.75){
        setActiveId(fastest.id);
      }
    }
  },[servers,settings.autoConnect,connected,connecting,activeId]);

  /* Speed simulation */
  useEffect(()=>{
    if(!connected){
      setSpeedData(Array.from({length:32},(_,i)=>({t:i,down:0,up:0})));
      return;
    }
    const tid = setInterval(()=>{
      const down = parseFloat((Math.random()*30+1.5).toFixed(1));
      const up   = parseFloat((Math.random()*7+0.4).toFixed(1));
      setTotalDown(p=>p+down/220);
      setTotalUp(p=>p+up/220);
      setSpeedData(p=>[...p.slice(1),{t:Date.now(),down,up}]);
    },500);
    return ()=>clearInterval(tid);
  },[connected]);

  /* Session timer */
  useEffect(()=>{
    if(!connected){ setElapsed(0); return; }
    connectedAtRef.current = Date.now();
    const tid = setInterval(()=>{
      setElapsed(Math.floor((Date.now()-connectedAtRef.current)/1000));
    },1000);
    return ()=>clearInterval(tid);
  },[connected]);

  /* Connect/disconnect via Electron + Xray/V2Ray core */
  const handleConnect = useCallback(async (sid)=>{
    if(connecting) return;
    const api = vpnApi();
    if(connected && activeId===sid){
      if(api) await api.disconnect();
      setConnected(false); setActiveId(null);
      setPublicIP("—"); setTotalDown(0); setTotalUp(0);
      setStatusMessage("Disconnected"); setErrorMessage("");
      return;
    }
    const target = servers.find(s=>s.id===sid);
    if(!target){ setErrorMessage("No server selected. Import a V2Ray config first."); return; }
    if(!api){
      setErrorMessage("Desktop core bridge is unavailable. Start the app with `npm run electron:dev` or `npm start` after build.");
      return;
    }
    setConnecting(true); setErrorMessage(""); setStatusMessage(`Starting Xray/V2Ray core for ${target.city}…`);
    try {
      const result = await api.connect(target, settings);
      setConnected(Boolean(result?.ok)); setActiveId(sid);
      setPublicIP(`${target.address}:${target.port}`);
      setStatusMessage(`Tunnel active · SOCKS ${result.localSocks} · HTTP ${result.localHttp}`);
    } catch (error) {
      setConnected(false); setActiveId(null); setPublicIP("—");
      setErrorMessage(error.message || "Connection failed.");
      setStatusMessage("Connection failed");
    } finally {
      setConnecting(false);
    }
  },[connecting,connected,activeId,servers,settings]);

  const sorted       = [...servers].sort((a,b)=>a.ping-b.ping);
  const activeServer = servers.find(s=>s.id===activeId)||null;
  const fastest      = sorted[0];

  return (
    <div style={{
      width:"100%",height:"100vh",background:C.bg,
      fontFamily:"'DM Sans',sans-serif",color:C.text,
      display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",
    }}>
      {/* Background grid */}
      <div style={{
        position:"fixed",inset:0,pointerEvents:"none",
        backgroundImage:`linear-gradient(${C.ca(0.022)} 1px,transparent 1px),linear-gradient(90deg,${C.ca(0.022)} 1px,transparent 1px)`,
        backgroundSize:"48px 48px",
      }}/>
      {/* Glow orbs */}
      <div style={{position:"fixed",top:-260,right:-160,width:680,height:680,borderRadius:"50%",
        background:`radial-gradient(circle,${C.va(0.065)} 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-260,left:-160,width:580,height:580,borderRadius:"50%",
        background:`radial-gradient(circle,${C.ca(0.045)} 0%,transparent 70%)`,pointerEvents:"none"}}/>
      {connected&&<div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        width:800,height:800,borderRadius:"50%",pointerEvents:"none",
        background:`radial-gradient(circle,${C.ca(0.025)} 0%,transparent 60%)`,transition:"all 1.5s ease"}}/>}

      <TitleBar connected={connected}/>
      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative"}}>
        <Sidebar view={view} setView={setView} connected={connected} autoConnect={settings.autoConnect}/>
        <div style={{flex:1,overflowY:"auto",position:"relative"}}>
          {view==="dashboard"&&(
            <DashboardView connected={connected} connecting={connecting} activeServer={activeServer}
              speedData={speedData} totalDown={totalDown} totalUp={totalUp} publicIP={publicIP}
              elapsed={elapsed} handleConnect={handleConnect} fastestServer={fastest}
              statusMessage={statusMessage} errorMessage={errorMessage}/>
          )}
          {view==="servers"&&(
            <ServersView servers={sorted} activeServerId={activeId} connected={connected}
              connecting={connecting} handleConnect={handleConnect} openImport={()=>{setSettingsTab("import");setView("settings");}}/>
          )}
          {view==="settings"&&(
            <SettingsView settings={settings} setSettings={setSettings} addServers={addServers} initialTab={settingsTab}/>
          )}
        </div>
      </div>
    </div>
  );
}
