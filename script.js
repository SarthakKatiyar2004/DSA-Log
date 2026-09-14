(function(){
  "use strict";

  const STORAGE_KEY = "dsa_log_rows_v1";
  const tbody = document.getElementById("tbody");

  let rows = load();

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){
      console.error("Failed to load DSA log", e);
      return [];
    }
  }

  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    document.getElementById("lastSaved").textContent = "saved " + new Date().toLocaleTimeString();
  }

  function uid(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }

  function todayStr(){
    return new Date().toISOString().slice(0,10);
  }

  function makeRow(){
    return {
      id: uid(),
      date: todayStr(),
      title: "",
      topics: "",
      platform: "",
      link: "",
      level: "Medium",
      type: "Solved",
      help: "No",
      time: "",
      approach: "",
      mistakes: "",
      solution: ""
    };
  }

  /* ---------------- revisit prediction ---------------- */
  // Base gap (days) per difficulty: harder problems get revisited sooner
  // because retention risk is higher and the concept is less settled.
  const BASE_GAP = { Easy: 6, Medium: 4, Hard: 2 };
  // Rough "expected" solve time per difficulty, used to judge if the
  // user struggled (took much longer) or breezed through (took much less).
  const EXPECTED_TIME = { Easy: 15, Medium: 30, Hard: 45 };

  function computeRevisitDate(row){
    if(!row.date || !row.level) return null;
    let gap = BASE_GAP[row.level] ?? 4;
    let mult = 1;

    if(row.help === "Yes") mult *= 0.6;         // needed help -> revisit sooner
    if(row.type === "Revised") mult *= 1.6;     // already reinforced once -> space out further

    const t = parseFloat(row.time);
    if(!isNaN(t) && t > 0){
      const expected = EXPECTED_TIME[row.level] ?? 30;
      if(t > expected * 1.5) mult *= 0.7;       // took much longer -> sooner
      else if(t < expected * 0.5) mult *= 1.3;  // very fast -> later
    }

    const finalGap = Math.max(1, Math.round(gap * mult));
    const base = new Date(row.date + "T00:00:00");
    if(isNaN(base.getTime())) return null;
    base.setDate(base.getDate() + finalGap);
    return base.toISOString().slice(0,10);
  }

  function revisitStatus(dateStr){
    if(!dateStr) return "na";
    const today = todayStr();
    if(dateStr < today) return "overdue";
    if(dateStr === today) return "today";
    return "upcoming";
  }

  /* ---------------- rendering ---------------- */

  function fieldControl(row, field, type){
    if(field === "level"){
      return selectEl(row, "level", ["Easy","Medium","Hard"]);
    }
    if(field === "type"){
      return selectEl(row, "type", ["Solved","Revised"]);
    }
    if(field === "help"){
      return selectEl(row, "help", ["No","Yes"]);
    }
    if(["approach","mistakes","solution"].includes(field)){
      const ta = document.createElement("textarea");
      ta.className = "cell-area";
      ta.value = row[field] || "";
      ta.rows = 1;
      ta.addEventListener("input", () => { row[field] = ta.value; save(); });
      return ta;
    }
    const input = document.createElement("input");
    input.className = "cell-input";
    input.type = type || "text";
    input.value = row[field] || "";
    if(field === "link") input.placeholder = "https://";
    if(field === "title") input.placeholder = "Two Sum";
    if(field === "topics") input.placeholder = "arrays, hashmap";
    if(field === "platform") input.placeholder = "LeetCode";
    if(field === "time") { input.min = "0"; input.placeholder = "e.g. 25"; }
    input.addEventListener("input", () => {
      row[field] = input.value;
      save();
      if(field === "date" || field === "time") renderRevisitCell(row);
      refreshDashboard();
    });
    return input;
  }

  function selectEl(row, field, options){
    const sel = document.createElement("select");
    sel.className = "cell-select";
    options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt; o.textContent = opt;
      if(row[field] === opt) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      row[field] = sel.value;
      save();
      renderRevisitCell(row);
      renderLevelBadge(row);
      refreshDashboard();
    });
    return sel;
  }

  function renderLevelBadge(row){
    const tr = tbody.querySelector('tr[data-id="'+row.id+'"]');
    if(!tr) return;
    const cell = tr.querySelector(".level-cell");
    cell.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";
    const badge = document.createElement("span");
    badge.className = "badge " + row.level;
    badge.textContent = row.level;
    cell.appendChild(fieldControl(row, "level"));
  }

  function renderRevisitCell(row){
    const tr = tbody.querySelector('tr[data-id="'+row.id+'"]');
    if(!tr) return;
    const cell = tr.querySelector(".revisit-cell");
    const rd = computeRevisitDate(row);
    row._revisit = rd;
    const status = revisitStatus(rd);
    cell.innerHTML = "";
    const tag = document.createElement("span");
    tag.className = "revisit-tag " + status;
    tag.textContent = rd ? rd : "\u2014";
    cell.appendChild(tag);
  }

  function renderRow(row){
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", row.id);

    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "row-del";
    delBtn.textContent = "\u00d7";
    delBtn.title = "Delete row";
    delBtn.addEventListener("click", () => {
      rows = rows.filter(r => r.id !== row.id);
      save();
      renderTable();
      refreshDashboard();
    });
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    const tdDate = document.createElement("td"); tdDate.className="col-date";
    tdDate.appendChild(fieldControl(row, "date", "date"));
    tr.appendChild(tdDate);

    const tdTitle = document.createElement("td"); tdTitle.className="col-title";
    tdTitle.appendChild(fieldControl(row, "title"));
    tr.appendChild(tdTitle);

    const tdTopics = document.createElement("td"); tdTopics.className="col-topics";
    tdTopics.appendChild(fieldControl(row, "topics"));
    tr.appendChild(tdTopics);

    const tdPlatform = document.createElement("td");
    tdPlatform.appendChild(fieldControl(row, "platform"));
    tr.appendChild(tdPlatform);

    const tdLink = document.createElement("td"); tdLink.className="col-link";
    tdLink.appendChild(fieldControl(row, "link", "url"));
    tr.appendChild(tdLink);

    const tdLevel = document.createElement("td"); tdLevel.className="level-cell";
    tdLevel.appendChild(fieldControl(row, "level"));
    tr.appendChild(tdLevel);

    const tdType = document.createElement("td");
    tdType.appendChild(fieldControl(row, "type"));
    tr.appendChild(tdType);

    const tdHelp = document.createElement("td");
    tdHelp.appendChild(fieldControl(row, "help"));
    tr.appendChild(tdHelp);

    const tdTime = document.createElement("td"); tdTime.className="col-time";
    tdTime.appendChild(fieldControl(row, "time", "number"));
    tr.appendChild(tdTime);

    const tdApproach = document.createElement("td"); tdApproach.className="col-note";
    tdApproach.appendChild(fieldControl(row, "approach"));
    tr.appendChild(tdApproach);

    const tdMistakes = document.createElement("td"); tdMistakes.className="col-note";
    tdMistakes.appendChild(fieldControl(row, "mistakes"));
    tr.appendChild(tdMistakes);

    const tdSolution = document.createElement("td"); tdSolution.className="col-note";
    tdSolution.appendChild(fieldControl(row, "solution"));
    tr.appendChild(tdSolution);

    const tdRevisit = document.createElement("td"); tdRevisit.className="revisit-cell";
    tr.appendChild(tdRevisit);

    tbody.appendChild(tr);
    renderRevisitCell(row);
  }

  function renderTable(){
    tbody.innerHTML = "";
    rows.forEach(renderRow);
    document.getElementById("rowCount").textContent =
      rows.length + (rows.length === 1 ? " problem logged" : " problems logged");
  }

  /* ---------------- dashboard ---------------- */

  function dateDaysAgo(n){
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0,10);
  }

  function computeStreaks(dateSet){
    // current streak: consecutive days ending today or yesterday
    let current = 0;
    let cursor = new Date();
    let cursorStr = cursor.toISOString().slice(0,10);
    if(!dateSet.has(cursorStr)){
      // allow streak to still "count" if yesterday was logged and today isn't over
      cursor.setDate(cursor.getDate() - 1);
      cursorStr = cursor.toISOString().slice(0,10);
      if(!dateSet.has(cursorStr)){
        current = 0;
        cursor = null;
      }
    }
    if(cursor){
      while(dateSet.has(cursorStr)){
        current++;
        cursor.setDate(cursor.getDate() - 1);
        cursorStr = cursor.toISOString().slice(0,10);
      }
    }

    // longest streak: scan sorted unique dates
    const sorted = Array.from(dateSet).sort();
    let longest = 0, run = 0, prev = null;
    sorted.forEach(ds => {
      if(prev){
        const prevDate = new Date(prev + "T00:00:00");
        const curDate = new Date(ds + "T00:00:00");
        const diff = Math.round((curDate - prevDate) / 86400000);
        if(diff === 1) run += 1;
        else run = 1;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      prev = ds;
    });

    return { current, longest };
  }

  function refreshDashboard(){
    const total = rows.length;
    const easy = rows.filter(r => r.level === "Easy").length;
    const medium = rows.filter(r => r.level === "Medium").length;
    const hard = rows.filter(r => r.level === "Hard").length;
    const helpCount = rows.filter(r => r.help === "Yes").length;
    const helpPct = total ? Math.round((helpCount/total)*100) : 0;

    const dateSet = new Set(rows.filter(r => r.date).map(r => r.date));
    const { current, longest } = computeStreaks(dateSet);

    document.getElementById("statStreak").innerHTML = current + " <small>days</small>";
    document.getElementById("statLongest").innerHTML = longest + " <small>days</small>";
    document.getElementById("statTotal").textContent = total;
    document.getElementById("statSplit").textContent = easy + " / " + medium + " / " + hard;
    document.getElementById("statHelp").textContent = helpPct + "%";

    const today = todayStr();
    const withRevisit = rows
      .map(r => ({ r, rd: r._revisit || computeRevisitDate(r) }))
      .filter(x => x.rd);
    const due = withRevisit.filter(x => x.rd <= today);
    document.getElementById("statDue").textContent = due.length;

    renderRevisitList(withRevisit);
    renderHeatmap(dateSet);
  }

  function renderRevisitList(withRevisit){
    const list = document.getElementById("revisitList");
    list.innerHTML = "";
    const sorted = withRevisit.slice().sort((a,b) => a.rd.localeCompare(b.rd));
    const relevant = sorted.slice(0, 40);
    if(relevant.length === 0){
      const p = document.createElement("div");
      p.className = "empty-note";
      p.textContent = "Nothing scheduled yet \u2014 log a problem to get a revisit date.";
      list.appendChild(p);
      return;
    }
    relevant.forEach(x => {
      const item = document.createElement("div");
      item.className = "revisit-item";
      const t = document.createElement("span");
      t.className = "t";
      t.textContent = x.r.title || "(untitled problem)";
      const d = document.createElement("span");
      const status = revisitStatus(x.rd);
      d.className = "d " + status;
      d.textContent = status === "overdue" ? x.rd + " \u2022 overdue" : (status === "today" ? "today" : x.rd);
      item.appendChild(t);
      item.appendChild(d);
      list.appendChild(item);
    });
  }

  function renderHeatmap(dateSet){
    const el = document.getElementById("heatmap");
    el.innerHTML = "";
    const days = 18 * 7;
    const counts = {};
    rows.forEach(r => {
      if(!r.date) return;
      counts[r.date] = (counts[r.date] || 0) + 1;
    });

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    // align start to a Sunday for clean weekly columns
    const startDay = start.getDay();
    start.setDate(start.getDate() - startDay);

    const cursor = new Date(start);
    while(cursor <= end){
      const ds = cursor.toISOString().slice(0,10);
      const c = counts[ds] || 0;
      const cell = document.createElement("div");
      cell.className = "heat-cell";
      let level = 0;
      if(c >= 1) level = 1;
      if(c >= 2) level = 2;
      if(c >= 3) level = 3;
      if(c >= 5) level = 4;
      cell.setAttribute("data-level", level);
      cell.title = ds + " \u2014 " + c + (c===1 ? " problem" : " problems");
      el.appendChild(cell);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  /* ---------------- toolbar actions ---------------- */

  document.getElementById("addRowBtn").addEventListener("click", () => {
    const row = makeRow();
    rows.push(row);
    save();
    renderRow(row);
    refreshDashboard();
    document.getElementById("rowCount").textContent =
      rows.length + (rows.length === 1 ? " problem logged" : " problems logged");
    const tr = tbody.querySelector('tr[data-id="'+row.id+'"]');
    if(tr){
      tr.scrollIntoView({ behavior: "smooth", block: "center" });
      const titleInput = tr.querySelector(".col-title input");
      if(titleInput) titleInput.focus();
    }
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dsa-log-" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(reader.result);
        if(!Array.isArray(parsed)) throw new Error("not an array");
        const existingIds = new Set(rows.map(r => r.id));
        parsed.forEach(r => {
          if(!r.id || existingIds.has(r.id)) r.id = uid();
          rows.push(r);
        });
        save();
        renderTable();
        refreshDashboard();
      }catch(err){
        alert("Could not import that file \u2014 make sure it's a JSON export from this tool.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    if(rows.length === 0) return;
    if(confirm("This deletes every logged problem from this browser. Export a backup first if you want to keep it. Continue?")){
      rows = [];
      save();
      renderTable();
      refreshDashboard();
    }
  });

  /* ---------------- init ---------------- */
  renderTable();
  refreshDashboard();
})();
