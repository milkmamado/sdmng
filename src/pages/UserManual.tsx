// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { 
  BookOpen, 
  Home, 
  Heart, 
  Users, 
  ClipboardCheck, 
  Calendar,
  BarChart3,
  Search,
  Plus,
  TrendingUp,
  BookMarked,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ShieldCheck,
  Clock,
  UserX
} from "lucide-react";
import excelStep1 from "@/assets/manual/excel-step1.png";
import excelStep2 from "@/assets/manual/excel-step2.png";
import excelStep3 from "@/assets/manual/excel-step3.png";
import excelStep4 from "@/assets/manual/excel-step4.png";

const ExcelGuideModal = () => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { image: excelStep1 },
    { image: excelStep2 },
    { image: excelStep3 },
    { image: excelStep4 }
  ];

  const handlePrevious = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : steps.length - 1));
  };

  const handleNext = () => {
    setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ImageIcon className="w-4 h-4" />
          엑셀 준비 방법 보기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>입원/외래 매출 엑셀 파일 준비 방법</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <img 
              src={steps[currentStep].image} 
              alt={`엑셀 준비 방법 ${currentStep + 1}단계`}
              className="w-full h-auto"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </Button>
            
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  aria-label={`${index + 1}단계로 이동`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="gap-2"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function UserManual() {
  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      {/* 헤더 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">사용자 메뉴얼</h1>
            <p className="text-muted-foreground">면력한방병원 환자 관리 시스템 완벽 가이드</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 시스템 소개 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              시스템 개요
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed">
              면력한방병원 환자 관리 시스템은 초진 상담부터 일별 상태 추적, 매출 분석까지 
              환자 관리의 전 과정을 효율적으로 지원하는 통합 시스템입니다.
            </p>
            <div className="bg-primary/5 border-l-4 border-primary p-4">
              <p className="text-sm flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>중요:</strong> 모든 데이터는 실시간으로 자동 저장되며, 
                  각 메뉴는 서로 연동되어 한 곳에서 수정하면 모든 곳에 즉시 반영됩니다.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 1. 대시보드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              1. 대시보드
            </CardTitle>
            <CardDescription>전체 환자 현황을 한눈에 확인</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                주요 지표
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="font-medium mb-1">📊 전체 환자</div>
                  <p className="text-sm text-muted-foreground">시스템에 등록된 총 환자 수</p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium mb-1">⚠️ 이탈 리스크 환자</div>
                  <p className="text-sm text-muted-foreground">아웃위기·아웃 상태 환자 수</p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium mb-1">📞 상담 현황</div>
                  <p className="text-sm text-muted-foreground">선택 월의 전화상담·방문상담·실패 현황</p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium mb-1">✅ 유입·치료 현황</div>
                  <p className="text-sm text-muted-foreground">유입 환자, 치료종료, 치료동의율과 재진관리 비율</p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* 2. 초진관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              2. 초진관리
            </CardTitle>
            <CardDescription>신규 환자 등록 및 초진 상담 관리</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-green-600" />
                  신규 환자 등록 (CRM 연동)
                </h4>

                <div className="space-y-4">
                  {/* CRM에서 바로 보내기 */}
                  <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50/50">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="font-semibold">CRM에서 바로 보내기</p>
                    </div>
                    <ol className="space-y-2 ml-4 text-sm">
                      <li className="flex gap-2">
                        <span className="font-bold text-green-700">1.</span>
                        <div>
                          CRM에서 <strong>환자 상세 화면</strong>을 연 상태에서 북마크바의 <Badge variant="outline">CRM 연동</Badge> 클릭
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-700">2.</span>
                        <div>사이트 초진관리가 새 탭으로 열리며 <strong>등록 폼이 자동으로 채워집니다</strong></div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-700">3.</span>
                        <div>유입상태·유입일·상담일·내원형태 등 사이트 입력 항목을 작성한 뒤 <Badge>등록</Badge> 클릭</div>
                      </li>
                    </ol>
                    <ul className="mt-3 ml-4 text-sm space-y-1 text-muted-foreground">
                      <li>• 이미 등록된 환자라면 새로 만들지 않고, <strong>수정 화면이 바뀐 값으로</strong> 열립니다 → 확인 후 <Badge>수정</Badge></li>
                      <li>• CRM 이름과 사이트 이름이 다르면 <strong>아무것도 바꾸지 않습니다</strong></li>
                    </ul>
                  </div>

                  {/* 공통 안내 */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                    <p className="text-sm leading-relaxed">
                      <strong>진단명·이전병원은 자동으로 채워집니다.</strong> 저장하면 상담내용의{' '}
                      <code className="bg-yellow-100 px-1">진단명 :</code>{' '}
                      <code className="bg-yellow-100 px-1">본병원 :</code> 표기와 진료메모2의 상병코드(예: C50)를 읽어 자동 분류합니다.
                      상담내용에 <code className="bg-yellow-100 px-1">진단명 : ○○ / 본병원 : ○○</code> 형식으로 적어주시면 정확도가 올라갑니다.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-blue-600" />
                  환자 검색 기능
                </h4>
                <p className="mb-2">검색창에서 다음 정보로 환자를 찾을 수 있습니다:</p>
                <div className="grid grid-cols-2 gap-2 ml-4">
                  <div>• 환자명</div>
                  <div>• 고객번호</div>
                  <div>• 담당매니저</div>
                  <div>• 주치의 이름</div>
                  <div>• 입원/외래</div>
                  <div>• 이전병원</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  주의사항
                </h4>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-3">
                  <ul className="text-sm space-y-1">
                    <li>• 환자 삭제는 복구할 수 없으니 신중하게 진행하세요</li>
                    <li>• CRM 연동 북마크(v2)가 설정되어 있어야 합니다 (8. CRM 연동 참고)</li>
                    <li>• 중복 등록을 방지하기 위해 등록 전 검색으로 기존 환자 여부를 확인하세요</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-600" />
                  유입상태 분류 기준
                </h4>
                <div className="space-y-3">
                  <div className="bg-red-50 border-2 border-red-500 p-4 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-900 mb-2">⚠️ 필수 확인 사항</p>
                        <p className="text-sm text-red-800 leading-relaxed">
                          유입상태는 <strong>유입, 전화상담, 방문상담, 실패</strong> 4가지로 분류됩니다. 
                          각 상태는 통계에 별도로 집계되므로 정확한 분류가 매우 중요합니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center mt-4">
                      <Button 
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 h-auto"
                        onClick={() => window.open('https://shell-brow-024.notion.site/2a166b31b17580f488f4e0c0244e46a0', '_blank')}
                      >
                        <BookMarked className="w-5 h-5" />
                        📋 유입상태 분류 기준 상세 가이드 보기
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. 관리 환자 리스트 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              3. 관리 환자 리스트
            </CardTitle>
            <CardDescription>모든 환자의 상세 정보 조회 및 수정</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  환자 정보 수정
                </h4>
                <ol className="space-y-2 ml-4">
                  <li>1. 환자 목록에서 수정할 환자 행 클릭</li>
                  <li>2. 상세 정보 팝업에서 각 필드를 직접 클릭하여 수정</li>
                  <li>3. 수정 완료 후 <Badge>수정</Badge> 버튼을 클릭하여 저장</li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">🔄 CRM 일괄 동기화</h4>
                <ol className="space-y-2 ml-4">
                  <li>1. <strong>CRM에 먼저 로그인</strong>해 둡니다.</li>
                  <li>2. 환자 리스트 상단 <Badge>CRM 일괄 동기화</Badge> 클릭 → 열린 CRM 창에서 북마크바 <Badge variant="outline">CRM 연동</Badge> 클릭</li>
                  <li>3. 미리보기에서 변경 내용과 주의 항목을 확인한 뒤 <Badge>적용</Badge>을 누릅니다.</li>
                </ol>
                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">기본정보</p>
                    <p className="text-sm text-muted-foreground">휴대폰·나이·특이사항·진료메모·최초/최종내원일·상담내용</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">입원정보 → 일별 상태</p>
                    <p className="text-sm text-muted-foreground">입원·재원·퇴원, 당일 입퇴원은 낮병동. 퇴원 당일 재입원은 끊지 않고 재원으로 이어집니다.</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">패키지</p>
                    <p className="text-sm text-muted-foreground">예치금 입금/사용, 적립금 입력/사용, 첩약관리 횟수</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">권장 범위</p>
                    <p className="text-sm text-muted-foreground">하루 1회 출근 후 권장. 마스터는 전체 환자, 실장 계정은 본인 환자를 동기화합니다.</p>
                  </div>
                </div>
                <div className="border rounded-lg p-3 mt-3">
                  <p className="text-sm font-semibold mb-2">미리보기에서 꼭 확인할 항목</p>
                  <ul className="text-sm space-y-1">
                    <li>• 이름 불일치, 일별 상태 충돌, 입원상태 빈 기록</li>
                    <li>• <strong>정리 대상</strong>: CRM에 없는 입원·재원·퇴원. 체크할 때만 삭제되며 외래·기타는 지우지 않습니다.</li>
                    <li>• <strong>현재 입원 중인데 아웃/아웃위기 → 관리 중</strong>: 기본 체크</li>
                    <li>• <strong>치료종료 처리</strong>: 기본 해제. 대상 목록 확인 후 직접 체크</li>
                    <li>• <strong>패키지 거래 반영</strong>: 기본 체크</li>
                    <li>• CRM에 없는 기존 패키지 거래는 삭제하지 않음</li>
                    <li>• 패키지 잔액 불일치, 종류 미정 패키지는 적용 전 확인</li>
                  </ul>
                </div>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-3 mt-3">
                  <p className="text-sm font-semibold mb-1">🛡️ 안전장치</p>
                  <ul className="text-sm space-y-1">
                    <li>• 이름이 다르거나 CRM 조회가 실패한 환자는 전체 반영을 건너뜁니다.</li>
                    <li>• CRM에 값이 없으면 기존 값을 유지하고, 최종 내원일은 더 늦은 날짜로만 바뀝니다.</li>
                    <li>• 상담기록이 2건 이상이면 기존 상담내용을 유지합니다.</li>
                    <li>• 입원정보는 2026년 5월 1일 이후부터 오늘까지만, 유입 환자에게 반영합니다.</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground mt-2">CRM 창이 로그인 화면이면 로그인 후 사이트에서 다시 시작하세요. 기존 「CRM 연동」 북마크 그대로 쓰면 됩니다.</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">🩺 진단명 · 이전병원 확인</h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <Badge variant="secondary">자동</Badge>
                        <span>상담내용·상병코드로 자동 확정된 값</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge className="bg-orange-600">확인 필요</Badge>
                        <span>자동 분류가 애매하거나 상담내용과 상병코드가 다른 경우</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline">수동</Badge>
                        <span>직접 선택하거나 확인한 값 — 이후 자동 분류가 덮어쓰지 않음</span>
                      </li>
                    </ul>
                  </div>
                  <ol className="space-y-2 ml-4 text-sm">
                    <li>
                      1. 리스트 상단 <Badge variant="outline">진단·병원 확인 필요만</Badge> 체크 → 확인이 필요하거나
                      진단명이 비어 있는 환자만 표시
                    </li>
                    <li>
                      2. 환자 수정 화면의 <strong>「진단명 · 이전병원」</strong> 영역에서 드롭다운으로 선택하거나{' '}
                      <Badge variant="outline">이대로 확인</Badge> 클릭
                    </li>
                  </ol>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  수납금액 표시
                </h4>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <p className="text-sm">
                    <strong>수납금액 = 예치금 입금</strong>
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    거래 내역은 환자 상세 팝업에서 확인할 수 있습니다.
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-purple-600" />
                  패키지 관리 (예치금, 적립금, 횟수)
                </h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <p className="text-sm">패키지는 <strong>「CRM 일괄 동기화」</strong>에서 자동 반영됩니다.</p>
                    <p className="text-sm text-muted-foreground mt-1">예치금 입금/사용, 적립금 입력/사용, 첩약관리 횟수를 가져오며 별도의 「패키지 연동」 북마크는 사용하지 않습니다.</p>
                  </div>
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-3">
                    <p className="text-sm"><strong>수납금액 = 예치금 입금 합계</strong></p>
                    <p className="text-xs mt-1">적용 전 미리보기의 패키지 잔액 불일치를 확인하세요. 사이트 잔액과 CRM 잔액이 같아야 정상입니다.</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">🔄 관리 상태 설명</h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">
                      <Badge className="bg-green-600">관리 중</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 일반적인 관리 상태</li>
                      <li>• 일별 환자 관리 현황에 표시됨</li>
                      <li>• 통계에 정상 관리 환자로 집계됨</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">
                      <Badge className="bg-orange-600">아웃위기</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 마지막 내원일(없으면 유입일, 상담일)로부터 21일 이상 경과 시 자동 분류</li>
                      <li>• 이탈 리스크 관리 페이지에 표시됨</li>
                      <li>• 대시보드 이탈 리스크 수에 포함됨</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">
                      <Badge className="bg-red-600">아웃</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 마지막 내원일(없으면 유입일, 상담일)로부터 30일 이상 경과 시 자동 분류</li>
                      <li>• 이탈 리스크 관리 페이지에 표시됨</li>
                      <li>• 통계의 아웃 환자 수에 집계됨</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">
                      <Badge variant="secondary">상태악화 / 치료종료 / 사망</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 일별 관리에서 제외됨</li>
                      <li>• 다시 "관리 중"으로 변경하면 일별 관리에 표시</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">
                      <Badge className="bg-purple-600">면책기간</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 관리 환자 리스트에서 수동으로 설정하는 상태</li>
                      <li>• 면책환자 관리 페이지에 별도로 표시됨</li>
                      <li>• 일별 관리에서 제외되며, 재연락 및 복귀 관리가 가능</li>
                      <li>• "관리 중으로 복귀" 시 일별 관리에 돌환 상태로 자동 기록됨</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. 일별 환자 관리 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              4. 일별 환자 관리 현황
            </CardTitle>
            <CardDescription>매일의 환자 상태를 캘린더로 추적</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">📅 일별 상태 기록 방법</h4>
                <ol className="space-y-2 ml-4">
                  <li>1. 상단에서 월 선택 (캘린더 또는 화살표 버튼)</li>
                  <li>2. 환자 리스트에서 상태를 기록할 환자의 날짜 칸 클릭</li>
                  <li>3. 직접 입력할 상태 선택: <strong>외래·낮병동·기타·전화F/U</strong></li>
                  <li className="text-sm text-muted-foreground">※ 입원·재원·퇴원은 CRM 일괄 동기화로 자동 입력되고, 당일 입퇴원은 낮병동으로 들어갑니다.</li>
                  <li className="text-sm text-muted-foreground">※ 연속 입원 기간은 분홍 배경으로 표시됩니다.</li>
                  <li className="text-sm text-muted-foreground">※ 기존 입원·재원·퇴원 칸은 메모 수정과 삭제가 가능합니다.</li>
                  
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">👤 환자명 클릭 시 팝업</h4>
                <p className="mb-2">환자 이름을 클릭하면 다음 정보를 확인할 수 있습니다:</p>
                <div className="space-y-2 ml-4">
                  <div>• <strong>월별 활동 통계:</strong> 입원일수, 외래일수, 낮병동일수, 전화상담 횟수</div>
                  <div>• <strong>패키지 관리 현황:</strong> 예치금, 리워드, 횟수권 잔액</div>
                  <div>• <strong>입원 매출:</strong> 거래 건수 및 총액</div>
                  <div>• <strong>외래 매출:</strong> 거래 건수 및 총액</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">📊 관리 상태 자동 업데이트</h4>
                <div className="space-y-2">
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-3">
                    <p className="text-sm">
                      <strong>아웃위기 (21일):</strong> 마지막 내원일로부터 21일 이상 경과 시 자동 변경
                    </p>
                  </div>
                  <div className="bg-red-50 border-l-4 border-red-500 p-3">
                    <p className="text-sm">
                      <strong>아웃 (30일):</strong> 마지막 내원일로부터 30일 이상 경과 시 자동 변경
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-sm">
                  <strong>💡 활용 팁:</strong> 입원·재원·퇴원은 CRM 일괄 동기화로 채워지니, 매일 아침
                  동기화 후 외래·전화F/U 등 나머지 상태만 입력하면 됩니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. 이탈 리스크 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              5. 이탈 리스크 관리
            </CardTitle>
            <CardDescription>관리가 필요한 환자를 자동으로 파악</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">⚠️ 리스크 판단 기준</h4>
                <div className="space-y-2">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium text-orange-600 mb-1">아웃위기 환자</div>
                    <p className="text-sm text-muted-foreground">
                      마지막 내원일(없으면 유입일, 상담일)로부터 21일 이상 경과한 환자
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium text-red-600 mb-1">아웃 환자</div>
                    <p className="text-sm text-muted-foreground">
                      마지막 내원일(없으면 유입일, 상담일)로부터 30일 이상 경과한 환자
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">입원 환자와 사망·상태악화·치료종료·면책기간 상태는 자동 아웃 판정에서 제외됩니다.</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">🔄 재연락 관리</h4>
                <ol className="space-y-2 ml-4">
                  <li>1. 이탈 리스크 환자 목록에서 재연락할 환자 확인</li>
                  <li>2. 우측 상단 전화번호 버튼 클릭하여 전화 걸기</li>
                  <li>3. <strong>담당자 메모</strong> 란에 재연락 상담 내용 기록 (전화 내용, 응답 여부 등)</li>
                  <li>4. <Badge variant="outline">메모 저장</Badge> 버튼 클릭</li>
                  <li>5. 재연락 성공 시 <Badge className="bg-green-600">재연락 완료</Badge> 체크박스 선택</li>
                  <li>6. 환자가 다시 관리 가능한 경우 <Badge>관리 중으로 복귀</Badge> 버튼 클릭
                    <div className="mt-2 ml-4">
                      <p className="text-sm text-muted-foreground">
                        → 자동으로 "관리 중" 상태로 변경됩니다<br/>
                        → 일별 환자 관리 현황에 오늘 날짜로 <Badge className="bg-purple-500">돌환</Badge> 상태가 추가됩니다
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-sm">
                  <strong>💡 팁:</strong> "관리 중으로 복귀" 버튼을 누르면 자동으로 관리 중 상태가 되고 
                  일별 현황에 "돌환"으로 기록되므로, 별도로 입력할 필요가 없습니다.
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-3">
                <p className="text-sm">
                  <strong>⚠️ 주의:</strong> 재연락 완료 체크와 메모 저장만으로는 "관리 중" 상태로 변경되지 않습니다. 
                  반드시 "관리 중으로 복귀" 버튼을 클릭해야 합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. 이탈 환자 스케줄 확인 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-primary" />
              6. 이탈 환자 스케줄 확인
            </CardTitle>
            <CardDescription>아웃·아웃위기 환자의 월별 일정과 상태 확인</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>유입 환자 중 관리 상태가 아웃 또는 아웃위기인 환자를 달력 형태로 확인합니다.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border rounded-lg p-3">
                <p className="font-medium mb-1">상태 기록</p>
                <p className="text-sm text-muted-foreground">날짜별 상태와 메모를 확인·수정하고 환자 표시 순서를 조정할 수 있습니다.</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="font-medium mb-1">엑셀 내보내기</p>
                <p className="text-sm text-muted-foreground">선택 월의 환자 정보와 날짜별 상태를 엑셀로 저장합니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. 면책기간 환자 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              7. 면책기간 환자 관리
            </CardTitle>
            <CardDescription>면책기간 상태 환자의 재연락 및 복귀 관리</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">🔍 면책기간 상태란?</h4>
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                  <p className="text-sm mb-2">
                    관리 환자 리스트에서 환자의 관리 상태를 "면책기간"으로 수동 설정한 환자들이 
                    이 페이지에 표시됩니다.
                  </p>
                  <p className="text-sm">
                    <strong>주요 특징:</strong>
                  </p>
                  <ul className="text-sm mt-2 space-y-1 ml-4">
                    <li>• 일별 환자 관리 현황에서 제외됨</li>
                    <li>• 별도의 면책환자 관리 페이지에서 관리</li>
                    <li>• 재연락 및 복귀 프로세스 지원</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">📋 면책환자 관리 페이지 구성</h4>
                <p className="text-sm mb-3">
                  면책기간 상태의 환자들을 조회하고 관리하는 전용 페이지입니다.
                </p>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-2">환자 카드 정보</div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• 환자 기본 정보 (이름, 연락처, 진단명)</li>
                      <li>• 유입일, 입원/외래 구분, 담당 실장</li>
                      <li>• 마지막 체크 이후 경과일 (자동 계산)</li>
                      <li>• 재연락 완료 상태</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">🎯 필터링 기능</h4>
                <div className="grid gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">담당 실장 선택</div>
                    <p className="text-sm text-muted-foreground">
                      특정 실장이 담당하는 면책기간 환자만 조회
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">유입일자 기간 필터</div>
                    <p className="text-sm text-muted-foreground">
                      시작일~종료일 범위로 유입일 기준 환자 조회
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">입원/외래 분류</div>
                    <p className="text-sm text-muted-foreground">
                      입원 또는 외래 환자만 필터링
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">진단명 검색</div>
                    <p className="text-sm text-muted-foreground">
                      진단명 키워드로 환자 검색
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  경과일 자동 계산
                </h4>
                <div className="border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    각 환자 카드에 "마지막 체크 이후" 경과일이 자동으로 표시됩니다.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    • 기준: 최종 내원일, 유입일, 또는 상담일 중 가장 최근 날짜<br/>
                    • 실시간 계산되어 항상 최신 상태 유지
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">🔄 재연락 관리</h4>
                <ol className="space-y-3 ml-4">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <div>
                      환자 카드에서 <Badge className="bg-green-600">재연락 완료</Badge> 체크박스 선택
                      <div className="mt-1 text-sm text-muted-foreground ml-4">
                        → 재연락 완료 시간이 자동으로 기록됩니다
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <div>
                      <strong>재연락 노트</strong> 입력창에 상담 내용 작성
                      <div className="mt-2 ml-4 text-sm text-muted-foreground">
                        기록할 내용:
                        <ul className="mt-1 space-y-1">
                          <li>• 전화 응답 여부</li>
                          <li>• 상담 내용 요약</li>
                          <li>• 환자 상태 및 반응</li>
                          <li>• 다음 연락 계획</li>
                        </ul>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <div>
                      <Badge variant="outline">노트 저장</Badge> 버튼 클릭하여 기록 저장
                    </div>
                  </li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">↩️ 관리 중으로 복귀</h4>
                <div className="space-y-3">
                  <p className="text-sm">
                    환자가 정상적으로 관리 가능한 상태가 되었을 때 사용하는 기능입니다.
                  </p>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">절차:</p>
                    <ol className="space-y-2 ml-4 text-sm">
                      <li>1. 환자 카드에서 <Badge>관리 중으로 복귀</Badge> 버튼 클릭</li>
                      <li>2. 확인 메시지에서 <Badge>확인</Badge> 선택</li>
                    </ol>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-500 p-4">
                    <p className="text-sm font-medium mb-2">
                      ✅ 자동 처리 사항:
                    </p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• 환자의 관리 상태가 "관리 중"으로 자동 변경</li>
                      <li>• 일별 환자 관리 현황에 오늘 날짜로 <Badge className="bg-purple-500">돌환</Badge> 상태 자동 기록</li>
                      <li>• 면책환자 관리 목록에서 자동으로 제외됨</li>
                      <li>• 이후 일별 환자 관리 현황에 정상 표시됨</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">📥 엑셀 내보내기</h4>
                <div className="space-y-3">
                  <ol className="space-y-2 ml-4">
                    <li>1. 우측 상단 <Badge variant="outline">엑셀 내보내기</Badge> 버튼 클릭</li>
                    <li>2. 현재 필터링된 환자 목록이 엑셀 파일로 다운로드됩니다</li>
                  </ol>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      <strong>포함 정보:</strong> 환자명, 연락처, 진단명, 유입일, 입원/외래, 
                      담당 실장, 경과일, 재연락 상태, 재연락 노트 등
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="text-sm font-medium mb-2">
                  ⚠️ 주의사항:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• 재연락 완료 체크와 노트 저장만으로는 관리 상태가 변경되지 않습니다</li>
                  <li>• 정상 관리로 전환하려면 반드시 "관리 중으로 복귀" 버튼을 클릭하세요</li>
                  <li>• 면책기간 상태는 관리 환자 리스트에서만 수동으로 설정 가능합니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 8. 통계 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              8. 통계 관리
            </CardTitle>
            <CardDescription>매출 및 환자 관리 통계 분석</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">📊 주요 통계 지표</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">총 관리 환자</div>
                    <p className="text-sm text-muted-foreground">유입상태가 유입이고 유입일이 입력된 관리 중 환자</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">누적 매출</div>
                    <p className="text-sm text-muted-foreground">
                      전체 기간 입금 합계
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">당월 매출</div>
                    <p className="text-sm text-muted-foreground">
                      선택한 월의 입금 합계
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">평균 객단가</div>
                    <p className="text-sm text-muted-foreground">환자 1인당 평균 매출액</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">📈 추가 분석 지표</h4>
                <div className="space-y-2">
                  <div>• <strong>신규 등록:</strong> 유입(유입일) + 전화상담·방문상담·실패(상담일)</div>
                  <div>• <strong>유입:</strong> 유입상태가 유입인 환자 전체(관리 중·치료종료·아웃·위기 포함)</div>
                  <div>• <strong>치료동의율:</strong> 유입 ÷ 신규 등록 × 100</div>
                  <div>• <strong>재진관리비율:</strong> 전월 초진 환자 중 당월 활동한 비율</div>
                  <div>• <strong>통계 매출 카드:</strong> 「입원/외래매출 관리」에서 업로드한 자료 기준</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">🎯 필터 기능</h4>
                <p className="mb-2">상단에서 다음 필터를 사용할 수 있습니다:</p>
                <div className="space-y-1 ml-4">
                  <div>• <strong>월 선택:</strong> 통계를 확인할 월 선택</div>
                  <div>• <strong>담당자 선택:</strong> 특정 담당자의 통계만 보기 (마스터/관리자 전용)</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 9. CRM 연동 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              9. CRM 연동
            </CardTitle>
            <CardDescription>병원 CRM 시스템과의 연동</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-4">
               <div>
                 <h4 className="font-semibold mb-3">🔗 북마크 설치 (v2, 1회만)</h4>
                 <ol className="space-y-2 ml-4">
                   <li>1. 사이드바의 <strong>「CRM 연동」</strong> 메뉴에서 <Badge>CRM 연동 코드 복사</Badge> 클릭</li>
                   <li>2. 크롬 북마크바의 기존 <strong>「CRM 연동」</strong> 북마크에 우클릭 → <strong>수정</strong> (없으면 아무 페이지에서 <code className="bg-muted px-1">Ctrl+D</code>로 새로 만들고 이름은 <code className="bg-muted px-1">CRM 연동</code>)</li>
                   <li>3. URL 칸의 내용을 <strong>전부 지운 뒤</strong> 복사한 코드를 붙여넣기 → 저장</li>
                 </ol>
                 <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-3">
                   <p className="text-sm">
                     <strong>v2부터는</strong> 기능이 개선돼도 북마크를 다시 바꿀 필요가 없습니다.
                   </p>
                 </div>
               </div>

               <Separator />

               <div>
                 <h4 className="font-semibold mb-3">📌 「CRM 연동」 북마크 쓰임새 2가지</h4>
                 <div className="grid gap-3 sm:grid-cols-2">
                   <div className="border rounded-lg p-3">
                     <p className="font-medium mb-1">① 일괄 동기화</p>
                     <p className="text-sm text-muted-foreground">
                       관리환자 리스트에서 시작합니다. 기본정보·입원정보·패키지를 함께 가져옵니다.{' '}
                       <span className="text-xs">(3. 관리 환자 리스트 참고)</span>
                     </p>
                   </div>
                   <div className="border rounded-lg p-3">
                     <p className="font-medium mb-1">② CRM에서 바로 보내기</p>
                     <p className="text-sm text-muted-foreground">
                       CRM 환자 상세 화면에서 클릭합니다. <span className="text-xs">(2. 초진관리 참고)</span>
                     </p>
                   </div>
                 </div>
                 <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-3">
                   <p className="text-sm"><strong>북마크는 「CRM 연동」 하나만 사용합니다.</strong> 「패키지 연동」 북마크는 더 이상 사용하지 않습니다.</p>
                 </div>
               </div>

               <Separator />

               <div>
                 <h4 className="font-semibold mb-3">🔄 일괄 동기화 내용과 확인사항</h4>
                 <div className="grid gap-3 sm:grid-cols-2">
                   <div className="border rounded-lg p-3"><strong>가져오는 항목</strong><p className="text-sm text-muted-foreground mt-1">기본정보, 입원·재원·퇴원·낮병동, 예치금·적립금·첩약관리 횟수</p></div>
                   <div className="border rounded-lg p-3"><strong>운영 기준</strong><p className="text-sm text-muted-foreground mt-1">하루 1회 출근 후 권장. 마스터는 전체 환자, 실장은 본인 환자</p></div>
                 </div>
                 <ul className="text-sm space-y-1 mt-3 ml-4">
                   <li>• 이름 불일치와 충돌을 먼저 확인합니다.</li>
                   <li>• 정리 대상은 체크할 때만 삭제하고, CRM에 없는 기존 패키지 거래는 삭제하지 않습니다.</li>
                   <li>• 치료종료는 기본 해제, 입원 중 아웃→관리 중과 패키지 거래 반영은 기본 체크입니다.</li>
                   <li>• 패키지 잔액 불일치와 종류 미정 패키지를 확인합니다.</li>
                 </ul>
               </div>

               <Separator />

               <div>
                 <h4 className="font-semibold mb-3">⚠️ 공통 주의</h4>
                 <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                   <ul className="text-sm space-y-1">
                     <li>• <strong>크롬 브라우저</strong>에서만 작동합니다</li>
                     <li>• 북마크를 누르기 전에 <strong>CRM에 로그인</strong>되어 있어야 합니다</li>
                     <li>• 사이트와 CRM을 <strong>같은 크롬 창·같은 모드</strong>에서 쓰세요 (사이트는 일반 창, CRM은 시크릿 창처럼 섞이면 연동되지 않습니다)</li>
                     <li>• 연동이 안 되면 두 창을 모두 닫고 크롬 시크릿 창(<code className="bg-blue-100 px-1">Ctrl+Shift+N</code>)에서 사이트 → CRM 순서로 다시 열어보세요</li>
                     <li>• <strong>「CRM 로그인이 만료됐습니다」</strong>가 뜨면 CRM에 다시 로그인한 뒤 처음부터 시작하세요</li>
                   </ul>
                 </div>
               </div>
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
