/* CRM 연동 스크립트 (v2) — 북마클릿 로더가 불러옵니다. 빌드 대상 아님. */
(function () {
  if (location.host !== '192.168.1.101') {
    alert('CRM 화면에서 눌러주세요');
    return;
  }
  if (window.__crmBridgeRunning) return;
  window.__crmBridgeRunning = true;

  var ALLOWED_ORIGINS = [
    'https://sdmng.lovable.app',
    'https://id-preview--2e2a51e4-c95c-4657-8637-0990159cceba.lovable.app'
  ];
  var IMPORT_URL = 'https://sdmng.lovable.app/%EC%84%B1%EB%8F%99/first-visit';
  var BNCH = '11';
  var BASE_PATH = '/crm/cmsn/cmsn0120sp/reqGetCmsn0120spPtBaseInfo.ajax';
  var CNSL_PATH = '/crm/cmsd/cmsd0160sm/getCmsd0160smAfterCnslMngmList.ajax';
  var ADMS_PATH = '/crm/cmsa/cmsa0010sm/getCmsa0010smAdmsList.ajax';
  var PKG_LIST_PATH = '/crm/cmsn/cmsn0240sm/getCmsn0240smPkgClntList.ajax';
  var PKG_ACT_PATH = '/crm/cmsn/cmsn0240sm/getCmsn0240smPkgClntActList.ajax';

  function done() { window.__crmBridgeRunning = false; }

  function originOf(url) {
    try { return new URL(url).origin; } catch (e) { return null; }
  }
  function isAllowed(origin) { return ALLOWED_ORIGINS.indexOf(origin) !== -1; }

  function decodeHash(key) {
    var hash = location.hash;
    var idx = hash.indexOf(key + '=');
    if (idx === -1) return undefined;
    var encoded = hash.substring(idx + key.length + 1);
    return JSON.parse(decodeURIComponent(atob(encoded)));
  }

  // ---------- 오버레이 ----------
  var overlay = null;
  function showOverlay(text) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#fff;border:1px solid #888;border-radius:8px;padding:10px 14px;font:13px sans-serif;color:#222;box-shadow:0 2px 10px rgba(0,0,0,.25);min-width:220px;';
      var close = document.createElement('button');
      close.textContent = '닫기';
      close.style.cssText = 'float:right;margin-left:10px;font-size:12px;cursor:pointer;';
      close.onclick = function () { overlay.remove(); overlay = null; };
      var body = document.createElement('div');
      body.className = '__crm_body';
      overlay.appendChild(close);
      overlay.appendChild(body);
      document.body.appendChild(overlay);
    }
    overlay.querySelector('.__crm_body').textContent = text;
  }

  // ---------- CRM 요청 ----------
  var consecutiveFail = 0;
  var sessionExpired = false;
  function crmPost(path, clntNo) {
    return fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'srch_clnt_no=' + encodeURIComponent(clntNo) + '&srch_bnch_cd=' + BNCH
    }).then(function (res) { return res.text(); }).then(function (txt) {
      var json;
      try { json = JSON.parse(txt); } catch (e) { json = null; }
      if (!json || json.result !== 'ok') {
        consecutiveFail++;
        if (consecutiveFail >= 3) sessionExpired = true;
        throw new Error('CRM 응답 오류');
      }
      consecutiveFail = 0;
      return json;
    });
  }

  function pickLatestCnsl(list) {
    var best = null;
    (list || []).forEach(function (c) {
      if (!c || !c.cnslCnts || !String(c.cnslCnts).trim()) return;
      var key = String(c.cnslDate || '') + String(c.cnslHm || '').padStart(4, '0');
      if (!best) { best = { c: c, key: key }; return; }
      if (key > best.key || (key === best.key && Number(c.cnslSqno || 0) > Number(best.c.cnslSqno || 0))) {
        best = { c: c, key: key };
      }
    });
    return best ? best.c : null;
  }

  // 입원정보 조회 — 실패해도 세션 만료 카운트에 반영하지 않음. 실패 시 null(모름)
  function fetchAdms(clntNo) {
    return fetch(ADMS_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'srch_clnt_no=' + encodeURIComponent(clntNo) + '&srch_bnch_cd=' + BNCH
    }).then(function (res) { return res.text(); }).then(function (txt) {
      var json;
      try { json = JSON.parse(txt); } catch (e) { return null; }
      if (!json || json.result !== 'ok') return null;
      var rows = Array.isArray(json.data) ? json.data : [];
      return rows.map(function (r) {
        return { admsDate: r.admsDate, dschDate: r.dschDate, admsYn: r.admsYn, wardNm: r.wardNm, roomNm: r.roomNm };
      });
    }).catch(function () { return null; });
  }

  // 패키지 조회 — 실패해도 세션 만료 카운트에 반영하지 않음. 실패 시 null(모름)
  function pkgPost(path, body) {
    return fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: body
    }).then(function (res) { return res.text(); }).then(function (txt) {
      var json;
      try { json = JSON.parse(txt); } catch (e) { throw new Error('pkg parse'); }
      if (!json || json.result !== 'ok') throw new Error('pkg result');
      return Array.isArray(json.data) ? json.data : [];
    });
  }
  function fetchPkgActs(clntNo, pkgCd, actCd, dvcd) {
    return pkgPost(PKG_ACT_PATH,
      'srch_bnch_cd=' + BNCH + '&srch_clnt_no=' + encodeURIComponent(clntNo) +
      '&srch_pkg_cd=' + encodeURIComponent(pkgCd) + '&srch_act_cd=' + actCd + '&srch_act_dvcd=' + dvcd
    ).then(function (rows) {
      return rows.filter(function (r) { return r && r.actStartDate !== '합계'; }).map(function (r) {
        return { actNo: r.actNo, actStartDate: r.actStartDate, actEndDate: r.actEndDate, actAmount: r.actAmount, actCnts: r.actCnts };
      });
    });
  }
  function fetchPkg(clntNo) {
    return pkgPost(PKG_LIST_PATH,
      'srch_bnch_cd=' + BNCH + '&srch_pkg_cd=&srch_clnt_no=' + encodeURIComponent(clntNo)
    ).then(function (list) {
      var out = [];
      var chain = Promise.resolve();
      list.forEach(function (p) {
        var hasB = Object.prototype.hasOwnProperty.call(p, 'actAmountB01') || Object.prototype.hasOwnProperty.call(p, 'actAmountB02');
        var item = {
          pkgCd: String(p.pkgCd), pkgNm: p.pkgNm,
          a01: p.actAmountA01, a02: p.actAmountA02, b01: p.actAmountB01, b02: p.actAmountB02,
          acts: { AA: [], AB: [], BA: [], BB: [] }
        };
        out.push(item);
        var kinds = hasB ? ['AA', 'AB', 'BA', 'BB'] : ['AA', 'AB'];
        kinds.forEach(function (k) {
          chain = chain.then(function () {
            return fetchPkgActs(clntNo, item.pkgCd, k.charAt(0), k.charAt(1));
          }).then(function (rows) { item.acts[k] = rows; return sleep(150); });
        });
      });
      return chain.then(function () { return out; });
    }).catch(function () { return null; });
  }

  function fetchRecord(clntNo) {
    return crmPost(BASE_PATH, clntNo).then(function (a) {
      var b0 = (a.data && a.data[0]) || null;
      if (!b0) return { clntNo: clntNo, ok: false, error: 'CRM에 환자 없음' };
      return crmPost(CNSL_PATH, clntNo).then(function (b) {
        var list = b.data || [];
        var latest = pickLatestCnsl(list);
        return Promise.all([fetchAdms(clntNo), fetchPkg(clntNo)]).then(function (res) {
          var adms = res[0], pkg = res[1];
          return {
            clntNo: clntNo,
            ok: true,
            base: {
              clntNm: b0.clntNm, sex: b0.sex, age: b0.age, hpTelno: b0.hpTelno, orgHpTelno: b0.orgHpTelno,
              upAddr: b0.upAddr, rmk1: b0.rmk1, rmk2: b0.rmk2,
              mdcrMemoCnts1: b0.mdcrMemoCnts1, mdcrMemoCnts2: b0.mdcrMemoCnts2,
              fsCmhsDt: b0.fsCmhsDt, lstCmhsDt: b0.lstCmhsDt
            },
            cnsl: {
              cnslCnts: latest ? latest.cnslCnts : null,
              cnslDate: latest ? latest.cnslDate : null,
              cnslHm: latest ? latest.cnslHm : null,
              count: list.length
            },
            adms: adms,
            pkg: pkg
          };
        });
      });
    }).catch(function (e) {
      return { clntNo: clntNo, ok: false, error: (e && e.message) || '조회 실패' };
    });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ---------- 모드 1: 일괄 동기화 ----------
  function runBulkSync(payload) {
    var appOrigin = originOf(payload && payload.app);
    if (!appOrigin || !isAllowed(appOrigin)) {
      alert('허용되지 않은 사이트에서 요청되었습니다.');
      return done();
    }
    var opener = window.opener;
    if (!opener || opener.closed) {
      showOverlay('사이트 창이 닫혀 있습니다');
      return done();
    }
    var ids = (payload.ids || []).filter(Boolean);
    var total = ids.length, finished = 0, ok = 0, failed = 0, idx = 0;
    var buffer = [];
    var stopped = false;

    function send(msg) {
      if (!window.opener || window.opener.closed) {
        stopped = true;
        showOverlay('사이트 창이 닫혀 있습니다');
        return false;
      }
      window.opener.postMessage(msg, appOrigin);
      return true;
    }
    function flush() {
      if (buffer.length) {
        send({ type: 'crm-bulk-chunk', records: buffer });
        buffer = [];
      }
    }
    function update() { showOverlay('CRM 동기화 진행 ' + finished + '/' + total + ' · 실패 ' + failed); }
    update();

    function worker() {
      if (stopped || sessionExpired || idx >= total) return Promise.resolve();
      var id = ids[idx++];
      return fetchRecord(id).then(function (rec) {
        finished++;
        if (rec.ok) ok++; else failed++;
        buffer.push(rec);
        if (buffer.length >= 20) flush();
        update();
        return sleep(150);
      }).then(worker);
    }

    Promise.all([worker(), worker(), worker()]).then(function () {
      if (stopped) return done();
      if (sessionExpired) {
        showOverlay('CRM 로그인이 만료됐습니다. 다시 로그인 후 눌러주세요');
        return done();
      }
      flush();
      send({ type: 'crm-bulk-done', total: total, ok: ok, failed: failed });
      showOverlay('완료: ' + total + '건 (성공 ' + ok + ' · 실패 ' + failed + ') — 사이트 창에서 확인하세요');
      done();
    });
  }

  // ---------- 모드 2: CRM에서 바로 보내기 ----------
  function runDirectSend() {
    var clntNo = '';
    var inputs = document.querySelectorAll('input[id*="bs_clnt_no"]');
    for (var i = 0; i < inputs.length; i++) {
      var v = (inputs[i].value || '').trim();
      if (v) { clntNo = v; break; }
    }
    if (!clntNo) {
      alert('환자 상세를 먼저 열어주세요');
      return done();
    }
    showOverlay('CRM에서 ' + clntNo + ' 정보를 가져오는 중...');
    fetchRecord(clntNo).then(function (rec) {
      if (sessionExpired || !rec.ok) {
        showOverlay(sessionExpired ? 'CRM 로그인이 만료됐습니다. 다시 로그인 후 눌러주세요' : ('조회 실패: ' + (rec.error || '')));
        return done();
      }
      var encoded = btoa(encodeURIComponent(JSON.stringify(rec)));
      window.open(IMPORT_URL + '#crm_import=' + encoded, '_blank');
      showOverlay('사이트로 보냈습니다: ' + (rec.base.clntNm || clntNo));
      done();
    });
  }

  // ---------- 모드 3: 기존 조회·최신화 (이전 북마클릿과 동일 동작) ----------
  function runLegacy(searchData, isPhoneUpdateMode) {
    var targetOrigin = originOf(searchData && searchData.appUrl);
    if (!targetOrigin || !isAllowed(targetOrigin)) {
      alert('허용되지 않은 사이트에서 요청되었습니다.');
      return done();
    }
    if (searchData) {
      var searchBtn = document.querySelector('[id*="btn_bsClntNmPopUp"]');
      if (searchBtn) {
        searchBtn.click();
        setTimeout(function () {
          var popup = document.querySelector('.win_popup-wapper');
          if (popup) {
            var nameInput = popup.querySelector('[id*="srch_clnt_nm"]');
            var phoneInput = popup.querySelector('[id*="srch_hp_telno"]');
            var branchSelect = popup.querySelector('[id*="srch_bnch_cd"]');
            var popupSearchBtn = popup.querySelector('[id*="btn_srch"]');
            if (branchSelect) branchSelect.value = '';
            if (isPhoneUpdateMode) {
              if (nameInput) nameInput.value = searchData.customer_number || '';
              if (phoneInput) phoneInput.value = '';
            } else {
              if (nameInput) nameInput.value = searchData.name || '';
              if (phoneInput) phoneInput.value = searchData.phone || '';
            }
            if (popupSearchBtn) popupSearchBtn.click();
          }
        }, 500);
      }
    }
    document.addEventListener('dblclick', function () {
      setTimeout(function () {
        var findInputWithValue = function (pattern) {
          var inputs = document.querySelectorAll('input[id*="' + pattern + '"]');
          for (var i = 0; i < inputs.length; i++) { if (inputs[i].value.trim()) return inputs[i]; }
          return null;
        };
        var findSelectWithValue = function (pattern) {
          var selects = document.querySelectorAll('select[id*="' + pattern + '"]');
          for (var i = 0; i < selects.length; i++) {
            var option = selects[i].options[selects[i].selectedIndex];
            if (option && option.value) return selects[i];
          }
          return selects.length > 0 ? selects[0] : null;
        };
        var findTextareaWithValue = function (pattern) {
          var tas = document.querySelectorAll('textarea[id*="' + pattern + '"]');
          for (var i = 0; i < tas.length; i++) { if (tas[i].value.trim()) return tas[i]; }
          return tas.length > 0 ? tas[0] : null;
        };
        var getValue = function (p) { var el = findInputWithValue(p); return el ? el.value.trim() : ''; };
        var getSelectedText = function (p) {
          var s = findSelectWithValue(p); if (!s) return '';
          var o = s.options[s.selectedIndex]; return o ? o.text.trim() : '';
        };
        var getTextareaValue = function (p) { var el = findTextareaWithValue(p); return el ? el.value.trim() : ''; };
        var getHospitalCategory = function () {
          var selects = document.querySelectorAll('select[id*="_up_org_hspt_cd"]');
          for (var i = 0; i < selects.length; i++) {
            if (selects[i].selectedIndex > 0) return selects[i].options[selects[i].selectedIndex].text.trim();
          }
          return '';
        };
        var getHospitalBranch = function () {
          var selects = document.querySelectorAll('select[id*="_org_hspt_cd"]:not([id*="_up_"])');
          for (var i = 0; i < selects.length; i++) {
            if (selects[i].selectedIndex > 0) return selects[i].options[selects[i].selectedIndex].text.trim();
          }
          return '';
        };
        var name = getValue('bs_clnt_nm');
        if (name) {
          var data = {
            name: name,
            customer_number: getValue('bs_clnt_no'),
            resident_number_masked: getValue('bs_rrn'),
            phone: getValue('bs_hp_telno'),
            gender: getValue('bs_sex'),
            age: getValue('bs_spec_age') || getValue('bs_age'),
            address: (getValue('bs_up_addr1') + ' ' + getValue('bs_ref_addr1')).trim(),
            visit_motivation: getSelectedText('cmhs_motv_cd'),
            diagnosis_category: getSelectedText('dgns_cd'),
            diagnosis_detail: getSelectedText('dgns_detl_cd'),
            hospital_category: getHospitalCategory(),
            hospital_branch: getHospitalBranch(),
            crm_memo: getTextareaValue('cms_call_memo'),
            counseling_content: getTextareaValue('cnsl_cnts'),
            special_note_1: getTextareaValue('rmk_1'),
            special_note_2: getTextareaValue('rmk_2'),
            treatment_memo_1: getTextareaValue('mdcr_memo_cnts_1'),
            treatment_memo_2: getTextareaValue('mdcr_memo_cnts_2')
          };
          var messageType = isPhoneUpdateMode ? 'crm-phone-data' : 'crm-patient-data';
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: messageType, data: data }, targetOrigin);
            window.close();
          } else {
            var appUrl = searchData ? searchData.appUrl : window.location.origin + '/first-visit';
            localStorage.setItem('crm_patient_data', JSON.stringify(data));
            window.open(appUrl + '?crm=import', '_blank');
          }
        }
      }, 500);
    });
    done();
  }

  // ---------- 모드 판별 ----------
  var hash = location.hash || '';
  try {
    if (hash.indexOf('crm_sync=') !== -1) {
      var syncPayload = decodeHash('crm_sync');
      // 해시를 지워 같은 탭에서 북마크를 다시 눌러도 일괄 동기화가 또 돌지 않게 함
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      runBulkSync(syncPayload);
    } else if (hash.indexOf('crm_phone_data=') !== -1) {
      runLegacy(decodeHash('crm_phone_data'), true);
    } else if (hash.indexOf('crm_data=') !== -1) {
      runLegacy(decodeHash('crm_data'), false);
    } else {
      runDirectSend();
    }
  } catch (e) {
    console.error('CRM 연동 오류:', e);
    alert('연동 데이터를 읽지 못했습니다.');
    done();
  }
})();
