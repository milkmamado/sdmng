// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, BookMarked, FileCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CRMBookmarklet() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // 북마크릿 JavaScript 코드 - CRM 자동화 (정식 버전)
  // 기본 정보 최신화: crm_data 해시 사용 (이름+전화번호 검색)
  // 휴대폰 번호 최신화: crm_phone_data 해시 사용 (고객번호 검색)
  // 이전 버전(v1) — 참고용으로 보관
  const legacyBookmarkletCode = `javascript:(function(){var hash=window.location.hash;var searchData=null;var isPhoneUpdateMode=false;if(hash.indexOf('crm_phone_data=')!==-1){try{var encoded=hash.split('crm_phone_data=')[1];var decoded=decodeURIComponent(atob(encoded));searchData=JSON.parse(decoded);isPhoneUpdateMode=true;}catch(e){console.error('데이터 파싱 오류:',e);return;}}else if(hash.indexOf('crm_data=')!==-1){try{var encoded=hash.split('crm_data=')[1];var decoded=decodeURIComponent(atob(encoded));searchData=JSON.parse(decoded);}catch(e){console.error('데이터 파싱 오류:',e);return;}}else{console.log('검색 데이터가 URL에 없습니다.');return;}if(searchData){var searchBtn=document.querySelector('[id*="btn_bsClntNmPopUp"]');if(searchBtn){searchBtn.click();setTimeout(function(){var popup=document.querySelector('.win_popup-wapper');if(popup){var nameInput=popup.querySelector('[id*="srch_clnt_nm"]');var phoneInput=popup.querySelector('[id*="srch_hp_telno"]');var branchSelect=popup.querySelector('[id*="srch_bnch_cd"]');var popupSearchBtn=popup.querySelector('[id*="btn_srch"]');if(branchSelect)branchSelect.value='';if(isPhoneUpdateMode){if(nameInput)nameInput.value=searchData.customer_number||'';if(phoneInput)phoneInput.value='';}else{if(nameInput)nameInput.value=searchData.name||'';if(phoneInput)phoneInput.value=searchData.phone||'';}if(popupSearchBtn){popupSearchBtn.click();}}},500);}}document.addEventListener('dblclick',function(e){setTimeout(function(){var findInputWithValue=function(pattern){var inputs=document.querySelectorAll('input[id*="'+pattern+'"]');for(var i=0;i<inputs.length;i++){var val=inputs[i].value.trim();if(val){return inputs[i];}}return null;};var findSelectWithValue=function(pattern){var selects=document.querySelectorAll('select[id*="'+pattern+'"]');for(var i=0;i<selects.length;i++){var select=selects[i];var option=select.options[select.selectedIndex];if(option&&option.value){return select;}}return selects.length>0?selects[0]:null;};var findTextareaWithValue=function(pattern){var textareas=document.querySelectorAll('textarea[id*="'+pattern+'"]');for(var i=0;i<textareas.length;i++){var val=textareas[i].value.trim();if(val){return textareas[i];}}return textareas.length>0?textareas[0]:null;};var getValue=function(pattern){var el=findInputWithValue(pattern);return el?el.value.trim():'';};var getSelectedText=function(pattern){var select=findSelectWithValue(pattern);if(!select)return'';var option=select.options[select.selectedIndex];return option?option.text.trim():'';};var getTextareaValue=function(pattern){var el=findTextareaWithValue(pattern);return el?el.value.trim():'';};var getHospitalCategory=function(){var selects=document.querySelectorAll('select[id*="_up_org_hspt_cd"]');for(var i=0;i<selects.length;i++){var select=selects[i];if(select.selectedIndex>0){var option=select.options[select.selectedIndex];return option.text.trim();}}return'';};var getHospitalBranch=function(){var selects=document.querySelectorAll('select[id*="_org_hspt_cd"]:not([id*="_up_"])');for(var i=0;i<selects.length;i++){var select=selects[i];if(select.selectedIndex>0){var option=select.options[select.selectedIndex];return option.text.trim();}}return'';};var name=getValue('bs_clnt_nm');if(name){var data={name:name,customer_number:getValue('bs_clnt_no'),resident_number_masked:getValue('bs_rrn'),phone:getValue('bs_hp_telno'),gender:getValue('bs_sex'),age:getValue('bs_spec_age')||getValue('bs_age'),address:(getValue('bs_up_addr1')+' '+getValue('bs_ref_addr1')).trim(),visit_motivation:getSelectedText('cmhs_motv_cd'),diagnosis_category:getSelectedText('dgns_cd'),diagnosis_detail:getSelectedText('dgns_detl_cd'),hospital_category:getHospitalCategory(),hospital_branch:getHospitalBranch(),crm_memo:getTextareaValue('cms_call_memo'),counseling_content:getTextareaValue('cnsl_cnts'),special_note_1:getTextareaValue('rmk_1'),special_note_2:getTextareaValue('rmk_2'),treatment_memo_1:getTextareaValue('mdcr_memo_cnts_1'),treatment_memo_2:getTextareaValue('mdcr_memo_cnts_2')};var messageType=isPhoneUpdateMode?'crm-phone-data':'crm-patient-data';if(window.opener&&!window.opener.closed){window.opener.postMessage({type:messageType,data:data},'*');window.close();}else{var appUrl=searchData?searchData.appUrl:window.location.origin+'/first-visit';localStorage.setItem('crm_patient_data',JSON.stringify(data));window.open(appUrl+'?crm=import','_blank');}}},500);});})();`;

  // 새 버전(v2) 로더 — 실제 동작은 /crm-bridge.js 에서 처리 (수정 시 북마크 재설치 불필요)
  const bookmarkletCode = `javascript:(function(){if(window.__crmBridgeRunning){return;}var s=document.createElement('script');s.src='https://sdmng.lovable.app/crm-bridge.js?t='+Date.now();s.onerror=function(){alert('연동 스크립트를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');};document.head.appendChild(s);})();`;
  const [showLegacy, setShowLegacy] = useState(false);

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    toast({
      title: "복사 완료",
      description: "연동 코드가 클립보드에 복사되었습니다.",
      duration: 1000,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  // URL 파라미터에서 crm=import 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('crm') === 'import') {
      const storedData = localStorage.getItem('crm_patient_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        localStorage.removeItem('crm_patient_data');
        
        // FirstVisitManagement 페이지로 데이터 전달
        window.dispatchEvent(new CustomEvent('crm-import', { detail: data }));
        
        toast({
          title: "CRM 데이터 가져오기 성공",
          description: `${data.name} 환자 정보를 불러왔습니다.`,
          duration: 1000,
        });
      }
    }
  }, [toast]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BookMarked className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">CRM 연동 설정</h1>
      </div>

      <Alert className="border-primary">
        <FileCode className="h-4 w-4" />
        <AlertDescription>
          <strong>새 버전(v2)</strong> — 북마크를 이 코드로 한 번 교체해주세요. 이후 기능이 바뀌어도 북마크를 다시 설치할 필요가 없습니다.
        </AlertDescription>
      </Alert>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
        <p className="text-sm">
          <strong>v2부터는</strong> 기능이 개선돼도 북마크를 다시 바꿀 필요가 없습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🔗 북마크 설치 (v2, 1회만)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">연동 코드 복사</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  사이드바의 <strong>「CRM 연동 설정」</strong> 메뉴에서 아래 버튼으로 코드를 복사합니다.
                </p>
                <Button onClick={handleCopyBookmarklet} className="w-full gap-2" size="lg">
                  {copied ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      복사됨!
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5" />
                      CRM 연동 코드 복사
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">기존 북마크에 붙여넣기</h3>
                <div className="space-y-3">
                  <div className="border rounded p-3 bg-blue-50">
                    <ol className="list-decimal list-inside ml-2 text-sm space-y-1">
                      <li>크롬 북마크바의 기존 <strong>「CRM 연동」</strong> 북마크에 마우스 우클릭 → <strong>수정</strong> 클릭</li>
                      <li>
                        (북마크가 없으면) 아무 페이지에서 <code className="bg-blue-100 px-1">Ctrl+D</code>로 새로 만들고 이름은{' '}
                        <code className="bg-blue-100 px-1">CRM 연동</code>
                      </li>
                      <li>URL 칸의 내용을 <strong>전부 지운 뒤</strong> 복사한 코드 <strong>전체</strong>를 붙여넣기</li>
                      <li>저장</li>
                    </ol>
                  </div>
                  <div className="bg-muted p-3 rounded text-sm">
                    <strong>북마크바가 보이지 않을 때:</strong> Ctrl + Shift + B (Windows) 또는 ⌘ + Shift + B (Mac)
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-2">설치 후 사용</h3>
                <p className="text-sm text-muted-foreground">
                  북마크는 <strong>CRM 화면</strong>에서만 누릅니다. 사이트에서 「CRM 일괄 동기화」나 「새 환자 등록 → 조회」를
                  눌러 CRM 창을 연 뒤, 그 CRM 창에서 북마크를 클릭하면 됩니다.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📌 북마크 쓰임새 3가지</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border rounded-lg p-3">
              <p className="font-medium mb-1">① 일괄 동기화</p>
              <p className="text-sm text-muted-foreground">
                사이트 환자 리스트에서 <strong>「CRM 일괄 동기화」</strong>를 눌러 시작합니다.
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-medium mb-1">② CRM에서 바로 보내기</p>
              <p className="text-sm text-muted-foreground">
                CRM에서 환자 상세 화면을 연 상태로 클릭하면 초진관리 등록 폼이 열립니다.
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-medium mb-1">③ 기존 조회·최신화</p>
              <p className="text-sm text-muted-foreground">
                사이트 「새 환자 등록 → 조회」, 「기본 정보 최신화」, 「휴대폰 번호 최신화」 버튼으로 열린 CRM 창에서 클릭한 뒤
                환자를 더블클릭합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">⚠️ 공통 주의</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <ul className="text-sm space-y-1">
              <li>• <strong>크롬 브라우저</strong>에서만 작동합니다</li>
              <li>• 북마크를 누르기 전에 <strong>CRM에 로그인</strong>되어 있어야 합니다</li>
              <li>• 사이트와 CRM을 <strong>같은 크롬 창·같은 모드</strong>에서 쓰세요 (사이트는 일반 창, CRM은 시크릿 창처럼 섞이면 연동되지 않습니다)</li>
              <li>• 연동이 안 되면 두 창을 모두 닫고 크롬 시크릿 창(<code className="bg-blue-100 px-1">Ctrl+Shift+N</code>)에서 사이트 → CRM 순서로 다시 열어보세요</li>
              <li>• <strong>「CRM 로그인이 만료됐습니다」</strong>가 뜨면 CRM에 다시 로그인한 뒤 처음부터 시작하세요</li>
              <li>• CRM 창이 로그인 화면으로 열렸다면, 로그인 후 사이트에서 다시 시작해 주세요</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <button type="button" className="text-left" onClick={() => setShowLegacy(v => !v)}>
            <CardTitle className="text-base">이전 버전 코드 (참고용) {showLegacy ? '▲' : '▼'}</CardTitle>
          </button>
        </CardHeader>
        {showLegacy && (
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap break-all max-h-64 overflow-y-auto">{legacyBookmarkletCode}</pre>
          </CardContent>
        )}
      </Card>
    </div>
  );
}