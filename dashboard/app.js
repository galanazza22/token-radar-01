// Token Radar's page: a static board, a detail view for every protocol, and a live-token view.
// No network, no fetch, no imports: everything renders from window.RADAR, the data.js this
// program's main.ts writes beside the page. The farm plan is generated here from the same fields
// and the same rules as board.json's farm_steps, so what the reader sees is what the board holds.

(function () {
  'use strict';
  var D = window.RADAR;
  var app = document.getElementById('app');
  var meta = document.getElementById('meta');
  var foot = document.getElementById('foot');

  if (!D || !Array.isArray(D.rows)) {
    app.innerHTML = '<p class="empty">No radar data: data.js did not load.</p>';
    app.setAttribute('aria-busy', 'false');
    return;
  }

  // ---------------------------------------------------------------- helpers

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** $1.24B, $45.3M, $823K. */
  function compact(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + String(Math.round(n));
  }

  function dollars(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function pct(v) {
    if (v === null || v === undefined) return '—';
    var s = (v > 0 ? '+' : '') + v.toFixed(1) + '%';
    return s;
  }

  function pctClass(v) {
    if (v === null || v === undefined) return '';
    return v >= 0 ? 'up' : 'down';
  }

  function ageText(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1).replace(/\.0$/, '') + 'y';
    return days + 'd';
  }

  function money(n) {
    return n >= 1 ? '$' + Math.round(n) : '$' + n.toFixed(2);
  }

  /** The first few chains, with a count for the rest. */
  function chainShort(chains) {
    var list = chains || [];
    if (list.length <= 4) return list.join(', ');
    return list.slice(0, 4).join(', ') + ' +' + (list.length - 4);
  }

  // ---------------------------------------------------------------- farm plan (mirrors lib/model.ts)

  /** A rough transaction cost on one chain, in whole dollars. */
  function gasUsd(chain) {
    var c = String(chain || '').toLowerCase();
    if (c === 'ethereum') return 8;
    if (c === 'solana' || c === 'sui' || c === 'aptos' || c === 'polygon' || c === 'near') return 0.05;
    if (c === 'base' || c === 'optimism' || c === 'zksync era' || c === 'scroll' || c === 'linea' || c === 'blast' || c === 'mode' || c === 'mantle' || c === 'ink' || c === 'world chain') return 0.15;
    if (c === 'arbitrum') return 0.2;
    if (c === 'bsc' || c === 'binance' || c === 'avalanche' || c === 'gnosis' || c === 'fantom' || c === 'berachain') return 0.3;
    if (c === 'tron') return 0.5;
    return 1;
  }

  function capitalFor(row) {
    if (row.tvl_usd >= 1000000000) return 250;
    if (row.tvl_usd >= 100000000) return 150;
    return 75;
  }

  function holdDaysFor(age) {
    if (age === null || age === undefined) return 60;
    if (age < 180) return 90;
    if (age < 365) return 60;
    return 45;
  }

  function actionFor(row, capital, chain) {
    var c = String(row.category || '').toLowerCase();
    var name = row.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s main pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('leveraged farm') >= 0 || c.indexOf('yield') >= 0) return 'Deposit $' + capital + ' into ' + name + '\'s main vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + capital + ' of the chain\'s staking asset through ' + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('deriv') >= 0 || c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('cdp manager') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of the protocol\'s yield asset on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('farm') >= 0) return 'Deposit $' + capital + ' into ' + name + '\'s farm on ' + chain + ' and keep the position open.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }

  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + ' Hold the position and check the protocol\'s own page.';
    return s;
  }

  /** A protocol's farm plan: six steps, each an action with a cost and a time. */
  function farmStepsFor(row) {
    var chain = row.chains && row.chains.length > 0 ? row.chains[0] : 'its main chain';
    var capital = capitalFor(row);
    var hold = holdDaysFor(row.age_days);
    var gas = gasUsd(chain);
    var action = actionFor(row, capital, chain);
    var steps = [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: action, cost: '$' + capital + ' of capital and about ' + money(gas) + ' of gas', time: '15 minutes to set up' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about ' + money(Math.max(gas * 2, 0.1)) + ' of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Before you withdraw, open the protocol\'s own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ];
    return steps.map(stepText);
  }

  // ---------------------------------------------------------------- state

  var params = new URLSearchParams(window.location.search);
  var view = params.get('view') || 'board';
  var tab = params.get('tab') || 'board';
  var state = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    chain: params.get('chain') || '',
    tier: params.get('tier') || 'all',
    sort: params.get('sort') || 'rank'
  };

  // The board's rows carry a watchlist flag; the tier filter uses it.
  function isWatch(r) { return !!r.watchlist; }

  var categories = [];
  var chains = [];
  D.rows.forEach(function (r) {
    if (r.category && categories.indexOf(r.category) < 0) categories.push(r.category);
    (r.chains || []).forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  categories.sort();
  chains.sort();

  var totalImplied = D.rows.reduce(function (n, r) { return n + r.implied_value_usd; }, 0);

  // ---------------------------------------------------------------- chrome

  meta.innerHTML = 'Snapshot <b>' + esc(D.as_of) + '</b> &middot; model <b>' + esc(D.model_version) +
    '</b> &middot; ' + D.watchlist_size + ' on the watchlist';
  foot.textContent = 'Source: ' + D.source + '. No network, no live prices: built from the sealed snapshot. ' +
    'Implied values are this radar\'s own claims, never a prediction that a token is issued.';

  document.querySelectorAll('#tabs a[data-tab]').forEach(function (a) {
    var on = (tab === 'live' && a.getAttribute('data-tab') === 'live') ||
      (tab !== 'live' && a.getAttribute('data-tab') === 'board' && view !== 'detail');
    if (on) a.setAttribute('aria-current', 'true');
  });

  function syncUrl() {
    var p = new URLSearchParams();
    if (view !== 'board') p.set('view', view);
    if (tab === 'live') p.set('tab', 'live');
    if (state.q) p.set('q', state.q);
    if (state.category) p.set('category', state.category);
    if (state.chain) p.set('chain', state.chain);
    if (state.tier !== 'all') p.set('tier', state.tier);
    if (state.sort !== 'rank') p.set('sort', state.sort);
    if (view === 'detail') p.set('slug', params.get('slug') || '');
    var qs = p.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
  }

  // ---------------------------------------------------------------- board

  function sortRows(rows) {
    var s = state.sort;
    var arr = rows.slice();
    if (s === 'implied') arr.sort(function (a, b) { return b.implied_value_usd - a.implied_value_usd; });
    else if (s === 'tvl') arr.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    else if (s === 'change') arr.sort(function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); });
    else if (s === 'age') arr.sort(function (a, b) { return (b.age_days || 0) - (a.age_days || 0); });
    else arr.sort(function (a, b) { return a.rank - b.rank; });
    return arr;
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return D.rows.filter(function (r) {
      if (state.tier === 'watchlist' && !isWatch(r)) return false;
      if (state.tier === 'early' && isWatch(r)) return false;
      if (state.category && r.category !== state.category) return false;
      if (state.chain && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function option(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>';
  }

  function renderBoard() {
    var rows = sortRows(filteredRows());
    var shown = rows.slice(0, 100);
    var html = '<div class="stats">' +
      '<div class="stat"><div class="k">Watchlist</div><div class="v">' + D.watchlist_size + '</div><div class="s">protocols at or above the $50M floor</div></div>' +
      '<div class="stat"><div class="k">Board</div><div class="v">' + D.board_size + '</div><div class="s">' + D.early_size + ' early finds below the floor</div></div>' +
      '<div class="stat"><div class="k">Total implied value</div><div class="v">' + compact(totalImplied) + '</div><div class="s">across the ranked board</div></div>' +
      '<div class="stat"><div class="k">Rank 1</div><div class="v">' + esc(D.rows[0].name) + '</div><div class="s">' + compact(D.rows[0].implied_value_usd) + ' implied</div></div>' +
      '</div>';

    html += '<div class="controls">' +
      '<label>Search <input type="search" id="f-q" placeholder="name, slug or category" value="' + esc(state.q) + '"></label>' +
      '<label>Category <select id="f-cat">' + option('', 'All categories') + categories.map(function (c) { return option(c, c, state.category === c); }).join('') + '</select></label>' +
      '<label>Chain <select id="f-chain">' + option('', 'All chains') + chains.map(function (c) { return option(c, c, state.chain === c); }).join('') + '</select></label>' +
      '<label>Tier <select id="f-tier">' +
      option('all', 'All rows', state.tier === 'all') + option('watchlist', 'Watchlist only', state.tier === 'watchlist') + option('early', 'Early finds', state.tier === 'early') +
      '</select></label>' +
      '<label>Sort <select id="f-sort">' +
      option('rank', 'Rank', state.sort === 'rank') + option('implied', 'Implied value', state.sort === 'implied') +
      option('tvl', 'TVL', state.sort === 'tvl') + option('change', '7-day change', state.sort === 'change') +
      option('age', 'Age', state.sort === 'age') +
      '</select></label>' +
      '<span class="count">' + rows.length + ' of ' + D.board_size + ' rows' + (rows.length > 100 ? ' · first 100 shown' : '') + '</span>' +
      '</div>';

    if (rows.length === 0) {
      html += '<p class="empty">Nothing matches these filters. Clear the search or pick another category.</p>';
    } else {
      html += '<table class="board"><thead><tr>' +
        '<th class="num">#</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
        '<th class="num">TVL</th><th class="num">7d</th><th class="num">Age</th><th class="num">Implied value</th>' +
        '</tr></thead><tbody>' +
        shown.map(function (r) {
          return '<tr><td class="num rank">' + r.rank + '</td>' +
            '<td class="name"><a href="?view=detail&amp;slug=' + esc(r.slug) + '">' + esc(r.name) + '</a>' +
            '<span class="slug">' + esc(r.slug) + (isWatch(r) ? ' · <span class="watch">WATCHLIST</span>' : '') + '</span></td>' +
            '<td><span class="chip">' + esc(r.category || '—') + '</span></td>' +
            '<td>' + esc((r.chains || []).slice(0, 3).join(', ')) + ((r.chains || []).length > 3 ? ' +' + ((r.chains || []).length - 3) : '') + '</td>' +
            '<td class="num">' + compact(r.tvl_usd) + '</td>' +
            '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
            '<td class="num">' + ageText(r.age_days) + '</td>' +
            '<td class="num val">' + compact(r.implied_value_usd) + '</td></tr>';
        }).join('') +
        '</tbody></table>';
    }
    app.innerHTML = html;

    var q = document.getElementById('f-q');
    var cat = document.getElementById('f-cat');
    var ch = document.getElementById('f-chain');
    var tier = document.getElementById('f-tier');
    var sort = document.getElementById('f-sort');
    q.addEventListener('input', function () { state.q = q.value; syncUrl(); renderBoard(); var nq = document.getElementById('f-q'); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); });
    cat.addEventListener('change', function () { state.category = cat.value; syncUrl(); renderBoard(); });
    ch.addEventListener('change', function () { state.chain = ch.value; syncUrl(); renderBoard(); });
    tier.addEventListener('change', function () { state.tier = tier.value; syncUrl(); renderBoard(); });
    sort.addEventListener('change', function () { state.sort = sort.value; syncUrl(); renderBoard(); });
  }

  // ---------------------------------------------------------------- live

  function renderLive() {
    var html = '<div class="stats">' +
      '<div class="stat"><div class="k">Live tokens</div><div class="v">' + D.live_size + '</div><div class="s">largest by market cap, kept apart</div></div>' +
      '<div class="stat"><div class="k">Largest market cap</div><div class="v">' + compact(D.live[0].mcap_usd || 0) + '</div><div class="s">' + esc(D.live[0].name) + '</div></div>' +
      '<div class="stat"><div class="k">Why apart</div><div class="v">Market</div><div class="s">their tokens already trade</div></div>' +
      '<div class="stat"><div class="k">Model claim</div><div class="v">None</div><div class="s">no implied value is stated for them</div></div>' +
      '</div>' +
      '<p class="lede" style="color:var(--muted);max-width:760px">These protocols already have a token that ' +
      'trades, so the board shows the market&rsquo;s own value for them and states no implied value. ' +
      'They are here so the reader can tell at a glance what is still to come from what is not.</p>' +
      '<table class="board"><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th>' +
      '<th class="num">TVL</th><th class="num">Market cap</th><th class="num">7d</th></tr></thead><tbody>' +
      D.live.map(function (r) {
        return '<tr><td class="name">' + esc(r.name) + '<span class="slug">' + esc(r.slug) + '</span></td>' +
          '<td><span class="chip">' + esc(r.category || '—') + '</span></td>' +
          '<td>' + esc((r.chains || []).slice(0, 3).join(', ')) + '</td>' +
          '<td class="num">' + compact(r.tvl_usd) + '</td>' +
          '<td class="num val">' + compact(r.mcap_usd || 0) + '</td>' +
          '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td></tr>';
      }).join('') + '</tbody></table>';
    app.innerHTML = html;
  }

  // ---------------------------------------------------------------- detail

  function renderDetail(slug) {
    var row = null;
    D.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) {
      app.innerHTML = '<p class="empty">No board row for “' + esc(slug) + '”. It may record a token already, or the watchlist rule may screen it out.</p><p><a class="back" href="?view=board">← Back to the board</a></p>';
      return;
    }
    var steps = farmStepsFor(row);
    var m = row;
    var html = '<a class="back" href="?view=board">← Back to the board</a>' +
      '<div class="detail-head"><h2>' + esc(row.name) + '</h2><span class="sub">rank #' + row.rank + ' of ' + D.board_size + ' · ' + esc(row.slug) + '</span></div>' +
      '<div class="badges"><span class="badge hot">Pre-token — records no token</span>' +
      '<span class="badge">' + esc(row.category || 'No category') + '</span>' +
      (isWatch(row) ? '<span class="badge">On the watchlist</span>' : '<span class="badge">Early find, below the $50M floor</span>') +
      '<span class="badge">' + esc(chainShort(row.chains)) + '</span></div>' +
      '<div class="grid">' +
      '<div class="cell"><div class="k">Implied value</div><div class="v">' + dollars(row.implied_value_usd) + '</div><div class="s">the radar&rsquo;s own claim</div></div>' +
      '<div class="cell"><div class="k">TVL</div><div class="v">' + dollars(row.tvl_usd) + '</div><div class="s">as of ' + esc(D.as_of) + '</div></div>' +
      '<div class="cell"><div class="k">7-day change</div><div class="v ' + pctClass(row.change_7d) + '">' + pct(row.change_7d) + '</div><div class="s">TVL over the last 7 days</div></div>' +
      '<div class="cell"><div class="k">Age</div><div class="v">' + (row.age_days === null ? 'Unknown' : row.age_days + ' days') + '</div><div class="s">' + (row.listed_at ? 'tracked since ' + esc(row.listed_at) : 'no listing date reported') + '</div></div>' +
      '<div class="cell"><div class="k">Chains</div><div class="v">' + (row.chains || []).length + '</div><div class="s">' + esc((row.chains || []).join(', ')) + '</div></div>' +
      '<div class="cell"><div class="k">Category factor</div><div class="v">×' + m.category_factor.toFixed(2) + '</div><div class="s">' + esc(row.category || 'uncategorised') + '</div></div>' +
      '</div>' +
      '<div class="panel"><h3>How the implied value is worked out</h3>' +
      '<table class="factors"><tbody>' +
      '<tr><td>Base — TVL × 0.30</td><td>' + dollars(m.base_value_usd) + '</td></tr>' +
      '<tr><td>Growth — 7-day change ' + (row.change_7d === null ? 'unreported (0%)' : pct(row.change_7d)) + '</td><td>× ' + m.growth_multiplier.toFixed(4) + '</td></tr>' +
      '<tr><td>Maturity — ' + (row.age_days === null ? 'age unknown (365 days)' : row.age_days + ' days tracked') + '</td><td>× ' + m.maturity_multiplier.toFixed(4) + '</td></tr>' +
      '<tr><td>Reach — ' + (row.chains || []).length + ' chain' + ((row.chains || []).length === 1 ? '' : 's') + '</td><td>× ' + m.chain_multiplier.toFixed(4) + '</td></tr>' +
      '<tr><td>Category — ' + esc(row.category || 'uncategorised') + '</td><td>× ' + m.category_factor.toFixed(2) + '</td></tr>' +
      '<tr class="total"><td>Implied value</td><td>' + dollars(row.implied_value_usd) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="note">Every factor comes from this protocol&rsquo;s own snapshot record. No name is ever special-cased.</p></div>' +
      '<div class="panel"><h3>How to farm it</h3><ol class="steps">' +
      steps.map(function (s) {
        var parts = s.split(' Cost: ');
        var head = parts[0] || s;
        var rest = parts[1] || '';
        var cost = rest.split('. Time: ')[0] || '';
        var time = (rest.split('. Time: ')[1] || '').replace(/\.$/, '');
        return '<li>' + esc(head) + '<br><span class="cost">Cost: ' + esc(cost) + '.</span> <span class="time">Time: ' + esc(time) + '.</span></li>';
      }).join('') +
      '</ol></div>' +
      '<p class="caveat">This protocol records no token in DefiLlama&rsquo;s record. That is the record, not ' +
      'proof it has none. The implied value is this radar&rsquo;s own claim about what a launch would be worth ' +
      'if the protocol&rsquo;s record stayed as it is — never a prediction that a token is issued, or when.</p>';
    app.innerHTML = html;
  }

  // ---------------------------------------------------------------- route

  if (view === 'detail') renderDetail(params.get('slug') || '');
  else if (tab === 'live') renderLive();
  else renderBoard();
  app.setAttribute('aria-busy', 'false');
})();
