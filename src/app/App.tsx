import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Filter,
  FolderOpen,
  HelpCircle,
  Home,
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  UploadCloud,
  UserCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Input } from "./components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Toaster } from "./components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { BidLibraryManager, type BidLibraryItem } from "./components/BidLibraryManager";
import { TenderAnalyzer, type TenderRequirement } from "./components/TenderAnalyzer";

type AuthView = "login" | "register" | "forgot" | "maintenance";
type PageKey = "home" | "asset" | "tender" | "proposal" | "collaboration" | "data-center" | "compliance" | "personal";
type AssetCategory = "qualification" | "performance" | "solution" | "archive" | "winning" | "resume";
type Role =
  | "管理员"
  | "技术标制作人"
  | "商务制作人"
  | "机动人员"
  | "初审人员"
  | "复审人员";

type UserAccount = {
  username: string;
  password: string;
  role: Role;
};

type UserSession = {
  username: string;
  role: Role;
};

type Project = {
  id: string;
  name: string;
  owner: string;
  deadline: string;
  progress: string;
  type: string;
};

type ModelConfig = {
  codingPlan: string;
  selectedModel: string;
  openaiKey: string;
  qwenKey: string;
  deepseekKey: string;
  baichuanKey: string;
};

type ProjectContext = {
  activeProjectId: string;
  projectName: string;
  tenderFile: { name: string; size: string; format: string } | null;
  tenderRequirements: TenderRequirement[];
  tenderOutline: string;
  lastParsedAt: string | null;
  proposalCompletedSections: number;
  proposalTotalSections: number;
};

const navMenus: { key: PageKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "asset", label: "资料管理", icon: FolderOpen },
  { key: "tender", label: "招标处理", icon: FileCheck2 },
  { key: "proposal", label: "标书编制", icon: FileText },
  { key: "collaboration", label: "项目协作", icon: Users },
  { key: "data-center", label: "数据中心", icon: BarChart3 },
];

const rolePermissions: Record<Role, { pages: PageKey[]; description: string }> = {
  管理员: {
    pages: ["home", "asset", "tender", "proposal", "collaboration", "data-center", "compliance", "personal"],
    description: "可新建项目、任务分发、审查标书、查看全量进度",
  },
  技术标制作人: {
    pages: ["home", "asset", "tender", "proposal", "collaboration", "personal"],
    description: "负责技术标编制与提交，查看自身代办任务",
  },
  商务制作人: {
    pages: ["home", "asset", "tender", "proposal", "collaboration", "personal"],
    description: "负责商务标编制与提交，查看自身代办任务",
  },
  机动人员: {
    pages: ["home", "asset", "collaboration", "personal"],
    description: "配合技术/商务制作，查看自身代办任务",
  },
  初审人员: {
    pages: ["home", "collaboration", "compliance", "personal"],
    description: "负责初步审查，处理审查任务",
  },
  复审人员: {
    pages: ["home", "collaboration", "compliance", "personal"],
    description: "负责最终复审，处理终审任务",
  },
};

const roleActionPermissions: Record<
  Role,
  { viewPending: boolean; assignTask: boolean; managePeople: boolean; reviewTask: boolean }
> = {
  管理员: { viewPending: true, assignTask: true, managePeople: true, reviewTask: true },
  技术标制作人: { viewPending: false, assignTask: false, managePeople: false, reviewTask: false },
  商务制作人: { viewPending: false, assignTask: false, managePeople: false, reviewTask: false },
  机动人员: { viewPending: false, assignTask: false, managePeople: false, reviewTask: false },
  初审人员: { viewPending: false, assignTask: false, managePeople: false, reviewTask: true },
  复审人员: { viewPending: false, assignTask: false, managePeople: false, reviewTask: true },
};

const searchPool = [
  "企业资质-建筑一级",
  "项目业绩-一表通",
  "技术方案-1104监管报送",
  "标书归档-银行监管项目",
  "中标案例-政务云平台",
  "招标处理-废标条款识别",
  "标书编制-商务承诺",
  "数据中心-中标率趋势",
];

const proposalOutline: { group: string; sections: { name: string; detail: string }[] }[] = [
  {
    group: "一、资信标",
    sections: [
      { name: "响应文件封面与目录", detail: "包含竞争性磋商采购响应文件封面、资信标目录。" },
      { name: "资格证明文件", detail: "企业法人营业执照、法定代表人身份证明、授权委托书、承诺函、磋商声明书。" },
      { name: "资信与业绩证明", detail: "近三年财务、纳税、社保、无违法记录、同类项目业绩表及相关证明、企业资质证书。" },
      { name: "其他资信文件", detail: "中小企业声明函、节能环保声明、信用中国/政府采购网截图。" },
    ],
  },
  {
    group: "二、商务标",
    sections: [
      { name: "商务标封面与目录", detail: "商务标封面、商务标目录。" },
      { name: "商务响应函", detail: "磋商响应函、商务条款逐条响应表、付款方式和违约责任承诺。" },
      { name: "商务承诺", detail: "工期承诺、质保承诺、保密承诺、知识产权承诺、廉洁承诺。" },
      { name: "项目团队配置", detail: "项目负责人及实施人员一览表、核心人员简历、资质证书、社保证明。" },
    ],
  },
  {
    group: "三、技术标",
    sections: [
      { name: "技术标封面与目录", detail: "技术标封面与目录，按第六章格式编排。" },
      { name: "项目理解与需求分析", detail: "项目背景理解、目标响应、核心功能需求拆解、逐条需求分析。" },
      { name: "总体技术方案", detail: "信创适配、数据报送全流程架构、1104/EAST对接方案、技术路线选型。" },
      { name: "项目实施计划", detail: "实施方法论、里程碑计划、甘特图与进度保障、风险识别与应对。" },
      { name: "质量与安全保障", detail: "质量保障体系、测试方案、信息安全方案、监管保密与合规措施。" },
      { name: "项目实施服务", detail: "履行地点方式、服务内容、响应标准、技术服务保障。" },
      { name: "交付与验收", detail: "交付文档清单、验收流程、功能/性能/安全/文档验收标准。" },
      { name: "培训方案", detail: "最终用户培训、管理员培训、培训材料和考核方式。" },
      { name: "技术偏离表", detail: "技术规范响应表、服务项目偏离表、合同条款偏离表。" },
      { name: "成功案例", detail: "近三年同类监管报送系统案例，附合同关键页/验收证明。" },
    ],
  },
  {
    group: "四、其他必备文件",
    sections: [
      { name: "报价文件封面", detail: "报价文件封面，标注项目名称和投标单位信息。" },
      { name: "报价一览表", detail: "项目名称、投标总价、工期、质保期。" },
      { name: "报价明细表", detail: "软件开发、实施服务、人力成本、培训、运维、税费等费用拆分。" },
      { name: "可选部件和服务报价表", detail: "额外运维服务、升级服务等可选报价。" },
      { name: "报价说明", detail: "服务范围、报价有效期、优惠承诺、付款方式响应。" },
      { name: "其他必备补充文件", detail: "保证金证明、履约承诺、其他声明承诺、响应文件自检查表。" },
    ],
  },
];

function App() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [isAuthed, setIsAuthed] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [accounts, setAccounts] = useState<UserAccount[]>([
    { username: "admin", password: "admin", role: "管理员" },
    { username: "tech01", password: "123456", role: "技术标制作人" },
  ]);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberPwd, setRememberPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerPwd, setRegisterPwd] = useState("");
  const [registerConfirmPwd, setRegisterConfirmPwd] = useState("");
  const [registerRole, setRegisterRole] = useState<Role>("机动人员");

  const [activePage, setActivePage] = useState<PageKey>("home");
  const [searchValue, setSearchValue] = useState("");
  const [activeAssetCategory, setActiveAssetCategory] = useState<AssetCategory>("qualification");
  const [configOpen, setConfigOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [projectTypeFilter, setProjectTypeFilter] = useState("全部");

  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    codingPlan: "",
    selectedModel: "gpt-4o",
    openaiKey: "",
    qwenKey: "",
    deepseekKey: "",
    baichuanKey: "",
  });

  const [board, setBoard] = useState<Record<string, Project[]>>({
    pending: [
      { id: "p1", name: "智慧园区建设投标", owner: "李工", deadline: "03-18", progress: "0%", type: "信息化" },
      { id: "p2", name: "政务云升级项目", owner: "王芳", deadline: "03-20", progress: "5%", type: "云平台" },
    ],
    ongoing: [
      { id: "p3", name: "银行监管报送平台", owner: "赵强", deadline: "03-13", progress: "62%", type: "金融" },
      { id: "p4", name: "校园安防改造", owner: "陈涛", deadline: "03-15", progress: "48%", type: "安防" },
    ],
    review: [{ id: "p5", name: "医疗信息一体化", owner: "刘洋", deadline: "03-11", progress: "95%", type: "医疗" }],
    done: [{ id: "p6", name: "工业互联网二期", owner: "何静", deadline: "03-03", progress: "100%", type: "工业" }],
  });
  const [dragMeta, setDragMeta] = useState<{ from: string; projectId: string } | null>(null);

  const [uploadedTender, setUploadedTender] = useState<{ name: string; size: string; format: string } | null>(null);
  const [parseProgress, setParseProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [libraryItems, setLibraryItems] = useState<BidLibraryItem[]>([]);
  const [projectContext, setProjectContext] = useState<ProjectContext>({
    activeProjectId: "proj-default",
    projectName: "银行监管报送平台",
    tenderFile: null,
    tenderRequirements: [],
    tenderOutline: "",
    lastParsedAt: null,
    proposalCompletedSections: 0,
    proposalTotalSections: proposalOutline.flatMap((g) => g.sections).length,
  });

  const permissions = session ? rolePermissions[session.role] : rolePermissions["机动人员"];
  const pageVisible = (page: PageKey) => permissions.pages.includes(page);

  useEffect(() => {
    if (!isAuthed) return;
    if (!pageVisible(activePage)) setActivePage("home");
  }, [activePage, isAuthed, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestList = useMemo(() => {
    if (!searchValue.trim()) return [];
    return searchPool.filter((item) => item.toLowerCase().includes(searchValue.toLowerCase())).slice(0, 6);
  }, [searchValue]);

  const filteredBoard = useMemo(() => {
    if (projectTypeFilter === "全部") return board;
    const next: Record<string, Project[]> = {};
    Object.keys(board).forEach((k) => (next[k] = board[k].filter((p) => p.type === projectTypeFilter)));
    return next;
  }, [board, projectTypeFilter]);

  const risks: { level: "high" | "medium"; text: string; target: PageKey }[] = [
    { level: "high", text: "资质证书将在 3 天后过期", target: "asset" },
    { level: "medium", text: "发现 2 项偏离招标条款", target: "tender" },
    { level: "high", text: "待审批标书 3 份已接近截止", target: "collaboration" },
  ];

  const quickEntries: { label: string; target: PageKey; icon: ComponentType<{ className?: string }> }[] = [
    { label: "解析招标文件", target: "tender", icon: FileCheck2 },
    { label: "新建标书", target: "proposal", icon: FileText },
    { label: "上传资料", target: "asset", icon: UploadCloud },
    { label: "我的审批", target: "collaboration", icon: ListChecks },
    { label: "标书模板", target: "proposal", icon: BookOpen },
    { label: "投标复盘", target: "data-center", icon: Target },
  ];

  const doLogin = () => {
    const hit = accounts.find((a) => a.username === loginUsername && a.password === loginPassword);
    if (!hit) {
      setLoginError("账号或密码错误，请重新输入");
      return;
    }
    setLoginError("");
    setSession({ username: hit.username, role: hit.role });
    setIsAuthed(true);
    setActivePage("home");
    if (rememberPwd) localStorage.setItem("smart-bid-last-user", hit.username);
    toast.success("登录成功，欢迎进入知识库");
  };

  const doRegister = () => {
    if (!registerName || !registerPwd || !registerConfirmPwd) {
      toast.error("请完整填写注册信息");
      return;
    }
    if (registerPwd !== registerConfirmPwd) {
      toast.error("两次密码输入不一致");
      return;
    }
    if (accounts.some((a) => a.username === registerName)) {
      toast.error("用户名已存在");
      return;
    }
    setAccounts((prev) => [...prev, { username: registerName, password: registerPwd, role: registerRole }]);
    toast.success("注册成功，请登录");
    setAuthView("login");
    setLoginUsername(registerName);
  };

  const doResetPassword = () => {
    const hit = accounts.find((a) => a.username === registerName);
    if (!hit) {
      toast.error("用户名不存在");
      return;
    }
    setAccounts((prev) =>
      prev.map((a) => (a.username === registerName ? { ...a, password: registerPwd } : a)),
    );
    toast.success("密码重置成功，请重新登录");
    setAuthView("login");
  };

  const doMaintenance = () => {
    if (!isAuthed || !session) {
      toast.error("账号维护需登录后访问");
      setAuthView("login");
      return;
    }
    if (!registerPwd || registerPwd !== registerConfirmPwd) {
      toast.error("请输入一致的新密码");
      return;
    }
    setAccounts((prev) =>
      prev.map((a) => (a.username === session.username ? { ...a, password: registerPwd } : a)),
    );
    toast.success("账号维护成功，密码已更新");
    setMaintenanceOpen(false);
    setRegisterPwd("");
    setRegisterConfirmPwd("");
  };

  const handleDrop = (toColumn: string) => {
    if (!dragMeta) return;
    const source = board[dragMeta.from];
    const target = board[toColumn];
    const moving = source.find((p) => p.id === dragMeta.projectId);
    if (!moving) return;
    setBoard((prev) => ({
      ...prev,
      [dragMeta.from]: prev[dragMeta.from].filter((p) => p.id !== dragMeta.projectId),
      [toColumn]: [moving, ...target],
    }));
    setDragMeta(null);
    toast.success("项目拖拽排序已更新");
  };

  const triggerParse = () => {
    if (!uploadedTender) {
      toast.error("请先上传招标文件");
      return;
    }
    setIsParsing(true);
    setParseProgress(0);
    const timer = setInterval(() => {
      setParseProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsParsing(false);
          setProjectContext((ctx) => ({
            ...ctx,
            tenderFile: uploadedTender,
            lastParsedAt: new Date().toISOString(),
          }));
          toast.success("招标文件解析完成");
          return 100;
        }
        return prev + 20;
      });
    }, 220);
  };

  const handleTenderAnalysisComplete = (requirements: TenderRequirement[]) => {
    const draftOutline = [
      "投标大纲：",
      ...requirements.slice(0, 8).map((req, idx) => `${idx + 1}. ${req.title}`),
    ].join("\n");
    setProjectContext((ctx) => ({
      ...ctx,
      tenderRequirements: requirements,
      tenderOutline: draftOutline,
      lastParsedAt: new Date().toISOString(),
    }));
    toast.success(`已同步 ${requirements.length} 条招标要求到项目上下文`);
  };

  if (!isAuthed) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-[#F5F7FA]">
        <Toaster />
        <div className="grid h-full w-full grid-cols-[45%_55%]">
          {/* 左侧品牌展示区 - 深空蓝渐变 */}
          <section
            className="relative overflow-hidden text-white"
            style={{
              background: "linear-gradient(180deg, #165DFF 0%, #0F42C1 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px),
                  linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px)`,
                backgroundSize: "42px 42px",
              }}
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-10 text-center">
              <h1 className="text-[28px] font-bold leading-tight">智慧标书・企业知识中枢</h1>
              <p className="mt-3 text-base">沉淀投标智慧，赋能每一次竞标决策</p>
              <p className="mt-5 text-[18px] font-semibold" style={{ color: "#FFD166" }}>
                智库引领，一击即中
              </p>
              <div className="mt-[30px] grid w-full max-w-[520px] grid-cols-3 gap-3">
                <InfoGlassCard title="标书数量" value="XXX 份" />
                <InfoGlassCard title="成功案例" value="XXX 个" />
                <InfoGlassCard title="行业标准库" value="实时更新" />
              </div>
            </div>
          </section>

          {/* 右侧登录交互区 */}
          <section className="relative flex items-center justify-center bg-[#F5F7FA]">
            <div
              className="w-full max-w-[380px] rounded-[8px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-shadow hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
            >
              {authView === "login" && (
                <div className="space-y-5">
                  <p className="text-center text-xl font-semibold" style={{ color: "#165DFF" }}>
                    账号登录
                  </p>
                  <div className="space-y-3">
                    <Input
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="请输入用户名"
                      className="h-10 rounded-[8px] border-[#E4E7ED] bg-white placeholder:text-[#909399] focus-visible:border-[#165DFF] focus-visible:ring-[#165DFF]/20"
                    />
                    <div className="relative">
                      <Input
                        type={showPwd ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="请输入密码"
                        className="h-10 rounded-[8px] border-[#E4E7ED] bg-white pr-10 placeholder:text-[#909399] focus-visible:border-[#165DFF] focus-visible:ring-[#165DFF]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909399] hover:text-[#303133]"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex cursor-pointer items-center gap-2 text-[#909399]">
                        <input
                          type="checkbox"
                          checked={rememberPwd}
                          onChange={(e) => setRememberPwd(e.target.checked)}
                          className="rounded border-[#E4E7ED]"
                        />
                        记住密码
                      </label>
                      <button
                        type="button"
                        className="text-[#165DFF] hover:text-[#0F42C1]"
                        onClick={() => setAuthView("forgot")}
                      >
                        忘记密码
                      </button>
                    </div>
                    {loginError && (
                      <p className="text-sm text-red-600">{loginError}</p>
                    )}
                  </div>
                  <Button
                    className="h-10 w-full rounded-[8px] bg-[#165DFF] text-white hover:bg-[#0F42C1] active:scale-[0.98]"
                    onClick={doLogin}
                  >
                    立即开启
                  </Button>
                  <div className="flex items-center justify-center gap-3 pt-2 text-sm">
                    <button
                      type="button"
                      className="text-[#165DFF] hover:text-[#0F42C1]"
                      onClick={() => setAuthView("register")}
                    >
                      账号注册
                    </button>
                    <span className="text-[#E4E7ED]">|</span>
                    <button
                      type="button"
                      className="text-[#165DFF] hover:text-[#0F42C1]"
                      onClick={() => setAuthView("maintenance")}
                    >
                      账号维护
                    </button>
                  </div>
                </div>
              )}

              {authView === "register" && (
                <div className="space-y-3">
                  <p className="text-center text-lg font-semibold text-[#165DFF]">账号注册</p>
                  <Input
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="用户名"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <Input
                    type="password"
                    value={registerPwd}
                    onChange={(e) => setRegisterPwd(e.target.value)}
                    placeholder="密码"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <Input
                    type="password"
                    value={registerConfirmPwd}
                    onChange={(e) => setRegisterConfirmPwd(e.target.value)}
                    placeholder="确认密码"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value as Role)}
                    className="h-10 w-full rounded-[8px] border border-[#E4E7ED] px-3 text-sm"
                  >
                    {Object.keys(rolePermissions).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <Button
                    className="w-full rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]"
                    onClick={doRegister}
                  >
                    完成注册
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-[#165DFF]"
                    onClick={() => setAuthView("login")}
                  >
                    返回登录
                  </button>
                </div>
              )}

              {authView === "forgot" && (
                <div className="space-y-3">
                  <p className="text-center text-lg font-semibold text-[#165DFF]">密码重置</p>
                  <Input
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="请输入用户名"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <Input
                    type="password"
                    value={registerPwd}
                    onChange={(e) => setRegisterPwd(e.target.value)}
                    placeholder="请输入新密码"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <Input
                    type="password"
                    value={registerConfirmPwd}
                    onChange={(e) => setRegisterConfirmPwd(e.target.value)}
                    placeholder="确认新密码"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <Button
                    className="w-full rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]"
                    onClick={doResetPassword}
                  >
                    重置密码
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-[#165DFF]"
                    onClick={() => setAuthView("login")}
                  >
                    返回登录
                  </button>
                </div>
              )}

              {authView === "maintenance" && (
                <div className="space-y-3">
                  <p className="text-center text-lg font-semibold text-[#165DFF]">账号维护</p>
                  <Input
                    value={registerPwd}
                    onChange={(e) => setRegisterPwd(e.target.value)}
                    type="password"
                    placeholder="请输入新密码"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <Input
                    value={registerConfirmPwd}
                    onChange={(e) => setRegisterConfirmPwd(e.target.value)}
                    type="password"
                    placeholder="确认新密码"
                    className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
                  />
                  <Button
                    className="w-full rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]"
                    onClick={doMaintenance}
                  >
                    保存维护信息
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-[#165DFF]"
                    onClick={() => setAuthView("login")}
                  >
                    返回登录
                  </button>
                </div>
              )}
            </div>

            <div className="absolute bottom-5 left-0 right-0 text-center text-xs text-[#909399]">
              技术支持：XXX-XXXXXXX | <button type="button" className="hover:text-[#165DFF]">隐私政策</button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FA] text-[#303133]">
      <Toaster />

      {/* 左侧导航栏 240px Mac OS 侧边栏风格 */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] flex-col border-r border-[#E4E7ED] bg-[#F5F7FA] flex">
        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          <div className="px-5 pb-2">
            <button
              type="button"
              onClick={() => setActivePage("home")}
              className="flex items-center gap-2 text-left"
            >
              <LayoutDashboard className="h-5 w-5 shrink-0 text-[#165DFF]" />
              <span className="text-lg font-bold text-[#165DFF]">智能标书库</span>
            </button>
          </div>
          <p className="px-5 pt-4 pb-2 text-xs font-medium uppercase tracking-wider text-[#909399]">MENU</p>
          <nav className="space-y-0.5 px-3">
            {[
              { key: "tender" as PageKey, label: "标书解析", icon: FileCheck2 },
              { key: "proposal" as PageKey, label: "标书编制", icon: FileText },
              { key: "asset" as PageKey, label: "企业库", icon: FolderOpen },
              { key: "collaboration" as PageKey, label: "项目协作", icon: Users },
              { key: "data-center" as PageKey, label: "数据中心", icon: BarChart3 },
            ]
              .filter((item) => pageVisible(item.key))
              .map((item) => {
                const Icon = item.icon;
                const active = activePage === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActivePage(item.key)}
                    className={`flex h-10 w-full items-center gap-2 rounded-[8px] px-5 text-sm transition-colors ${
                      active
                        ? "bg-[#165DFF] text-white"
                        : "text-[#303133] hover:bg-[#E4E7ED]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
          </nav>
          <p className="px-5 pt-6 pb-2 text-xs font-medium uppercase tracking-wider text-[#909399]">ACCOUNT</p>
          <nav className="space-y-0.5 px-3">
            <button
              type="button"
              onClick={() => setActivePage("personal")}
              className={`flex h-10 w-full items-center gap-2 rounded-[8px] px-5 text-sm hover:bg-[#E4E7ED] ${
                activePage === "personal" ? "bg-[#E8F0FF] text-[#165DFF]" : "text-[#303133]"
              }`}
            >
              <UserCircle className="h-4 w-4 shrink-0" />
              个人中心
            </button>
            <button
              type="button"
              onClick={() => setMaintenanceOpen(true)}
              className="flex h-10 w-full items-center gap-2 rounded-[8px] px-5 text-sm text-[#303133] hover:bg-[#E4E7ED]"
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              编辑资料
            </button>
          </nav>
          <p className="px-5 pt-6 pb-2 text-xs font-medium uppercase tracking-wider text-[#909399]">OTHER</p>
          <nav className="space-y-0.5 px-3">
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              className="flex h-10 w-full items-center gap-2 rounded-[8px] px-5 text-sm text-[#303133] hover:bg-[#E4E7ED]"
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              设置
            </button>
            <button
              type="button"
              onClick={() => toast.info("帮助文档（敬请期待）")}
              className="flex h-10 w-full items-center gap-2 rounded-[8px] px-5 text-sm text-[#303133] hover:bg-[#E4E7ED]"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              帮助
            </button>
          </nav>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-[240px]">
        {/* 顶部导航栏 64px 磨砂玻璃 */}
        {/* 顶部导航栏 64px 磨砂玻璃 */}
        <header className="fixed top-0 left-[240px] right-0 z-30 flex h-16 items-center border-b border-[#E4E7ED]/50 bg-[rgba(255,255,255,0.9)] px-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-md">
          <div className="mx-auto flex h-full w-full max-w-[1400px] items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-[8px] gap-1.5 text-[#303133] hover:bg-[#F0F2F5]"
              onClick={() => setActivePage("home")}
            >
              <Home className="h-4 w-4" />
              首页
            </Button>
            <div className="relative flex-1 max-w-[600px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#909399]" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="搜索资料、模板、项目、标书…"
                className="h-9 w-full rounded-[8px] border-[#E4E7ED] bg-white pl-9 text-sm placeholder:text-[#909399] focus-visible:border-[#165DFF]"
              />
              {suggestList.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[8px] border border-[#E4E7ED] bg-white p-1 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                  {suggestList.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="block w-full rounded-[4px] px-2 py-1.5 text-left text-xs text-[#303133] hover:bg-[#F0F2F5]"
                      onClick={() => {
                        setSearchValue(item);
                        setActivePage("data-center");
                        toast.success("已跳转至检索结果页（数据中心）");
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-[8px] gap-1.5 text-[#303133] hover:bg-[#F0F2F5]"
              onClick={() => setConfigOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
              配置
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-[#F0F2F5]"
                >
                  <Avatar className="h-8 w-8 border border-[#E4E7ED]">
                    <AvatarFallback className="bg-[#E4E7ED] text-sm text-[#303133]">
                      {session?.username.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-[#303133]">{session?.username}</span>
                  <ChevronDown className="h-4 w-4 text-[#909399]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-[12px] border-[#E4E7ED] bg-[rgba(255,255,255,0.98)] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                <DropdownMenuLabel>个人中心</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMaintenanceOpen(true)}>个人设置</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActivePage("collaboration")}>我的任务</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsAuthed(false);
                    setSession(null);
                    setAuthView("login");
                    toast.success("已退出登录");
                  }}
                >
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </header>

      <main className="flex-1 px-5 pb-6 pt-[80px]">
        {activePage === "home" && (
          <HomePage
            board={filteredBoard}
            setDragMeta={setDragMeta}
            onDrop={handleDrop}
            onProjectClick={() => setActivePage("collaboration")}
            projectTypeFilter={projectTypeFilter}
            setProjectTypeFilter={setProjectTypeFilter}
            quickEntries={quickEntries.filter((item) => pageVisible(item.target))}
            onQuickClick={setActivePage}
            risks={risks}
            onRiskClick={setActivePage}
          />
        )}

        {activePage === "asset" && (
          <AssetPage
            activeCategory={activeAssetCategory}
            onCategoryChange={setActiveAssetCategory}
            libraryItems={libraryItems}
            onLibraryUpdate={setLibraryItems}
          />
        )}
        {activePage === "tender" && (
          <TenderPage
            uploadedTender={uploadedTender}
            onUploadTender={(fileMeta) => {
              setUploadedTender(fileMeta);
              setProjectContext((ctx) => ({ ...ctx, tenderFile: fileMeta }));
            }}
            parseProgress={parseProgress}
            isParsing={isParsing}
            onParse={triggerParse}
            onGoCompliance={() => setActivePage("compliance")}
            onNextStep={() => setActivePage("proposal")}
            onAnalysisComplete={handleTenderAnalysisComplete}
          />
        )}
        {activePage === "proposal" && (
          <ProposalPage
            projectContext={projectContext}
            onProjectContextUpdate={(next) => setProjectContext((ctx) => ({ ...ctx, ...next }))}
          />
        )}
        {activePage === "collaboration" && (
          <CollaborationPage role={session?.role ?? "机动人员"} projectContext={projectContext} />
        )}
        {activePage === "compliance" && <CompliancePage />}
        {activePage === "data-center" && <DataCenterPage projectContext={projectContext} />}
        {activePage === "personal" && (
          <PersonalCenterPage
            onGoToCompleted={() => setActivePage("collaboration")}
            onGoToPending={() => setActivePage("collaboration")}
          />
        )}
      </main>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-3xl rounded-[12px] border-[#E4E7ED] bg-[rgba(255,255,255,0.98)] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <DialogHeader>
            <DialogTitle>系统配置</DialogTitle>
            <DialogDescription>包含人员配置（仅查看当前角色）和模型配置（coding plan、API-Key、模型切换）。</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="personnel">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personnel">人员配置</TabsTrigger>
              <TabsTrigger value="model">模型配置页</TabsTrigger>
            </TabsList>
            <TabsContent value="personnel" className="mt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">当前角色与权限</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>当前用户：{session?.username}</p>
                  <p>当前角色：{session?.role}</p>
                  <p className="text-slate-600">{session ? rolePermissions[session.role].description : ""}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(session ? rolePermissions[session.role].pages : []).map((page) => (
                      <Badge key={page} variant="secondary">
                        {page}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="model" className="mt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">大模型参数配置（实时生效）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Coding Plan</p>
                    <textarea
                      className="h-20 w-full rounded-md border p-2 text-sm"
                      value={modelConfig.codingPlan}
                      onChange={(e) => setModelConfig((prev) => ({ ...prev, codingPlan: e.target.value }))}
                      placeholder="输入本次标书生成策略与计划..."
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">模型切换</p>
                    <select
                      className="h-9 w-full rounded-md border px-2 text-sm"
                      value={modelConfig.selectedModel}
                      onChange={(e) => setModelConfig((prev) => ({ ...prev, selectedModel: e.target.value }))}
                    >
                      <option>gpt-4o</option>
                      <option>deepseek-chat</option>
                      <option>qwen-plus</option>
                      <option>baichuan4</option>
                    </select>
                  </div>
                  <Input
                    value={modelConfig.openaiKey}
                    onChange={(e) => setModelConfig((prev) => ({ ...prev, openaiKey: e.target.value }))}
                    placeholder="OpenAI API-Key"
                  />
                  <Input
                    value={modelConfig.qwenKey}
                    onChange={(e) => setModelConfig((prev) => ({ ...prev, qwenKey: e.target.value }))}
                    placeholder="通义千问 API-Key"
                  />
                  <Input
                    value={modelConfig.deepseekKey}
                    onChange={(e) => setModelConfig((prev) => ({ ...prev, deepseekKey: e.target.value }))}
                    placeholder="DeepSeek API-Key"
                  />
                  <Input
                    value={modelConfig.baichuanKey}
                    onChange={(e) => setModelConfig((prev) => ({ ...prev, baichuanKey: e.target.value }))}
                    placeholder="百川 API-Key"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              onClick={() => {
                toast.success(`模型已切换为 ${modelConfig.selectedModel}，配置已生效`);
                setConfigOpen(false);
              }}
            >
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent className="max-w-md rounded-[12px] border-[#E4E7ED] bg-[rgba(255,255,255,0.98)] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <DialogHeader>
            <DialogTitle className="text-[#165DFF]">账号维护</DialogTitle>
            <DialogDescription>修改当前账号密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={registerPwd}
              onChange={(e) => setRegisterPwd(e.target.value)}
              type="password"
              placeholder="请输入新密码"
              className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
            />
            <Input
              value={registerConfirmPwd}
              onChange={(e) => setRegisterConfirmPwd(e.target.value)}
              type="password"
              placeholder="确认新密码"
              className="rounded-[8px] border-[#E4E7ED] focus-visible:border-[#165DFF]"
            />
          </div>
          <DialogFooter>
            <Button
              className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]"
              onClick={doMaintenance}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function InfoGlassCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/20 bg-white/15 p-3 text-left backdrop-blur-sm">
      <p className="text-xs text-white/90">{title}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function HomePage({
  board,
  setDragMeta,
  onDrop,
  onProjectClick,
  projectTypeFilter,
  setProjectTypeFilter,
  quickEntries,
  onQuickClick,
  risks,
  onRiskClick,
}: {
  board: Record<string, Project[]>;
  setDragMeta: (v: { from: string; projectId: string } | null) => void;
  onDrop: (to: string) => void;
  onProjectClick: () => void;
  projectTypeFilter: string;
  setProjectTypeFilter: (v: string) => void;
  quickEntries: { label: string; target: PageKey; icon: ComponentType<{ className?: string }> }[];
  onQuickClick: (v: PageKey) => void;
  risks: { level: "high" | "medium"; text: string; target: PageKey }[];
  onRiskClick: (v: PageKey) => void;
}) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="grid grid-cols-5 gap-4">
        {/* 项目进度看板 60% */}
        <Card className="col-span-3 h-[400px] rounded-[12px] border-[#E4E7ED] bg-[rgba(255,255,255,0.9)] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <CardHeader className="pb-2 px-6 pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-[#303133]">项目进度</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[8px] border-[#E4E7ED] hover:bg-[#F0F2F5]"
                  onClick={() => toast.success("已打开筛选条件（示意）")}
                >
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  筛选
                </Button>
                <select
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                  className="h-8 rounded-[8px] border border-[#E4E7ED] px-2 text-xs text-[#303133]"
                >
                  {["全部", "信息化", "云平台", "金融", "安防", "医疗", "工业"].map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid h-[320px] grid-cols-4 gap-2 px-6 pb-6">
            {[
              { title: "待启动", key: "pending" },
              { title: "进行中", key: "ongoing" },
              { title: "待审批", key: "review" },
              { title: "已完成", key: "done" },
            ].map((column) => (
              <div
                key={column.key}
                className="rounded-[8px] bg-[#F0F2F5] p-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(column.key)}
              >
                <p className="mb-2 text-xs font-semibold text-[#909399]">{column.title}</p>
                <div className="space-y-2">
                  {board[column.key].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragMeta({ from: column.key, projectId: item.id })}
                      onClick={onProjectClick}
                      className="w-full rounded-[8px] border border-[#E4E7ED] bg-white p-2 text-left text-xs transition-shadow hover:border-[#165DFF]/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    >
                      <p className="line-clamp-1 font-medium text-[#303133]">{item.name}</p>
                      <p className="mt-1 text-[#909399]">负责人：{item.owner}</p>
                      <p className="text-[#909399]">截止：{item.deadline}</p>
                      <p className="text-[#165DFF]">进度：{item.progress}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 常用功能快捷入口 40% */}
        <Card className="col-span-2 h-[400px] rounded-[12px] border-[#E4E7ED] bg-[rgba(255,255,255,0.9)] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-base font-bold text-[#303133]">常用功能</CardTitle>
          </CardHeader>
          <CardContent className="grid h-[320px] grid-cols-3 gap-3 px-6 pb-6">
            {quickEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() => onQuickClick(entry.target)}
                  className="flex flex-col items-center justify-center rounded-[8px] bg-[#F0F2F5] text-[#303133] transition-colors hover:bg-[#165DFF] hover:text-white"
                >
                  <Icon className="mb-2 h-5 w-5" />
                  <span className="text-xs">{entry.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 风险预警提示 */}
      <Card className="h-[80px] rounded-[12px] border-[#E4E7ED] border-l-4 border-l-red-500 bg-[rgba(255,255,255,0.9)] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <CardContent className="flex h-full items-center gap-3 px-6">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-semibold text-red-600">风险提示</p>
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {risks.map((risk) => (
              <button
                key={risk.text}
                type="button"
                onClick={() => onRiskClick(risk.target)}
                className={`rounded-[4px] px-2 py-1 text-xs ${
                  risk.level === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {risk.text}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 数据概览 */}
      <Card className="rounded-[12px] border-[#E4E7ED] bg-[rgba(255,255,255,0.9)] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <CardHeader className="pb-1 px-6 pt-6">
          <CardTitle className="text-base font-bold text-[#303133]">数据概览</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-3 px-6 pb-6">
          <DataCard title="本月投标项目数" value="36" trend="+8%" color="bg-[#165DFF]" />
          <DataCard title="中标率" value="41%" trend="+3.1%" color="bg-[#FFD166]" />
          <DataCard title="标书编制平均耗时" value="2.8天" trend="-0.6天" color="bg-[#165DFF]" />
          <DataCard title="资料入库数量" value="1,286" trend="+125" color="bg-[#FFD166]" />
        </CardContent>
      </Card>
    </div>
  );
}

// 通用本地上传功能模拟，点击按钮后唤起本地文件选择
const handleGenericUpload = (message: string = "文件已选择", accept: string = "*/*", multiple: boolean = false, onSuccess?: () => void) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      if (multiple) {
        toast.success(`${message}：已选择 ${files.length} 个本地文件`);
      } else {
        toast.success(`${message}：已选择文件 ${files[0].name}`);
      }
      if (onSuccess) onSuccess();
    }
  };
  input.click();
};

function AssetPage({
  activeCategory,
  onCategoryChange,
  libraryItems,
  onLibraryUpdate,
}: {
  activeCategory: AssetCategory;
  onCategoryChange: (v: AssetCategory) => void;
  libraryItems: BidLibraryItem[];
  onLibraryUpdate: (items: BidLibraryItem[]) => void;
}) {
  const [qualificationView, setQualificationView] = useState<"main" | "upload" | "credit">("main");
  const [resumeDialog, setResumeDialog] = useState(false);
  const [resumeTemplateDialog, setResumeTemplateDialog] = useState(false);
  const [overallUploadProgress, setOverallUploadProgress] = useState(0);
  const [overallAnalyzed, setOverallAnalyzed] = useState(false);
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0);
  const [resumeExtractReady, setResumeExtractReady] = useState(false);
  const [overallUploadedFiles, setOverallUploadedFiles] = useState<string[]>([]);
  const [solutionUploadedFiles, setSolutionUploadedFiles] = useState<string[]>([]);
  const overallUploadInputRef = useRef<HTMLInputElement | null>(null);
  const solutionUploadInputRef = useRef<HTMLInputElement | null>(null);
  const resumeUploadInputRef = useRef<HTMLInputElement | null>(null);

  const categories: { key: AssetCategory; label: string }[] = [
    { key: "qualification", label: "企业资质" },
    { key: "performance", label: "项目业绩" },
    { key: "solution", label: "技术方案" },
    { key: "archive", label: "标书归档" },
    { key: "winning", label: "中标案例" },
    { key: "resume", label: "人员简历" },
  ];

  return (
    <div className="grid grid-cols-[200px_1fr] gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">资料分类</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((item) => (
            <button
              key={item.key}
              onClick={() => onCategoryChange(item.key)}
              className={`w-full rounded px-2 py-2 text-left text-sm ${
                activeCategory === item.key ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {activeCategory === "performance"
                ? "项目业绩"
                : activeCategory === "archive"
                  ? "标书归档"
                  : activeCategory === "winning"
                    ? "中标标书"
                    : activeCategory === "resume"
                      ? "人员简历"
                      : `资料管理 · ${categories.find((item) => item.key === activeCategory)?.label}`}
            </CardTitle>
            {(activeCategory === "qualification" || activeCategory === "solution" || activeCategory === "archive") && (
              <div className="flex gap-2">
                {activeCategory === "qualification" && (
                  <Button
                    size="sm"
                    onClick={() => overallUploadInputRef.current?.click()}
                  >
                    整体上传
                  </Button>
                )}
                {activeCategory === "solution" && (
                  <Button size="sm" onClick={() => solutionUploadInputRef.current?.click()}>
                    整体上传
                  </Button>
                )}
                {activeCategory === "archive" && <Button size="sm" onClick={() => handleGenericUpload("归档文件上传成功")}>上传</Button>}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={overallUploadInputRef}
            type="file"
            accept=".doc,.docx,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (!files.length) return;
              setOverallUploadedFiles(files.map((f) => f.name));
              setOverallUploadProgress(100);
              toast.success(`整体上传完成：${files.length} 个文件`);
            }}
          />
          <input
            ref={solutionUploadInputRef}
            type="file"
            accept=".doc,.docx,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (!files.length) return;
              setSolutionUploadedFiles(files.map((f) => f.name));
              toast.success(`技术方案整体上传完成：${files.length} 个文件`);
            }}
          />
          <input
            ref={resumeUploadInputRef}
            type="file"
            accept=".doc,.docx,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setResumeUploadProgress(100);
              setResumeExtractReady(true);
              toast.success(`简历上传完成：${file.name}`);
            }}
          />
          {activeCategory === "qualification" && qualificationView === "main" && (
            <div className="space-y-4">
              {overallUploadProgress > 0 && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 text-xs">
                    <p className="mb-2">整体上传进度：{overallUploadProgress}%</p>
                    <div className="h-2 rounded bg-slate-200">
                      <div className="h-2 rounded bg-blue-600" style={{ width: `${overallUploadProgress}%` }} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" disabled={overallUploadProgress < 100} onClick={() => setOverallAnalyzed(true)}>
                        分析
                      </Button>
                      {overallAnalyzed && <span className="text-green-600">AI已分析并归档：标书+公司基本情况表 等文件</span>}
                    </div>
                    {overallUploadedFiles.length > 0 && (
                      <div className="mt-2 text-slate-600">
                        已上传文件：{overallUploadedFiles.join("，")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-[18px] font-bold text-[#1B365D]">公司基本情况表</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p>支持上传 PDF/Word，上传后网页内直接预览。</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleGenericUpload("公司基本情况表上传成功", ".pdf,.doc,.docx")}>上传</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("开始下载公司基本情况表")}>下载</Button>
                    </div>
                    <TableBox heads={["文件名", "上传时间", "格式"]} rows={[["公司基本情况表.docx", "2026-03-09 12:30", "DOCX"]]} />
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-[18px] font-bold text-[#1B365D]">公司简介</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleGenericUpload("公司简介上传成功", ".pdf,.doc,.docx")}>上传</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("开始下载公司简介文件")}>下载</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("公司简介已复制到剪贴板（示意）")}>一键复制</Button>
                    </div>
                    <textarea className="h-20 w-full rounded border p-2 text-xs" defaultValue="公司成立于..." />
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-[18px] font-bold text-[#1B365D]">公司资质清单</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <TableBox
                      heads={["资质名称", "资质编号", "发证日期", "到期日", "上传时间", "操作"]}
                      rows={[
                        ["软件著作权", "RZ-001", "2024-01-01", "2028-01-01", "2026-03-09", "预览/下载/删除"],
                        ["CMMI5", "CMMI-2026", "2025-02-20", "2029-12-31", "2026-03-09", "预览/下载/删除"],
                      ]}
                    />
                    <Button size="sm" onClick={() => setQualificationView("upload")}>上传资质</Button>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-[18px] font-bold text-[#1B365D]">客户占有率</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleGenericUpload("客户占有率文件上传成功")}>上传</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("开始下载客户占有率文件")}>下载</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("客户占有率说明已复制（示意）")}>一键复制</Button>
                    </div>
                    <textarea className="h-16 w-full rounded border p-2" defaultValue="城商行客户覆盖率..." />
                    <div className="h-12 rounded bg-white p-2">图表示意区域</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-[18px] font-bold text-[#1B365D]">与监管合作案例</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleGenericUpload("监管合作案例文件上传成功")}>上传</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("开始下载监管合作案例文件")}>下载</Button>
                    </div>
                    <TableBox heads={["案例名称", "合作时间", "合作人行机构", "案例简介", "操作"]} rows={[["监管报送平台二期", "2025-06", "某省人行分支", "监管数据报送建设", "预览/下载"]]} />
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-[18px] font-bold text-[#1B365D]">公司组织架构</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleGenericUpload("组织架构图上传成功", "image/*,.pdf")}>上传</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("开始下载组织架构图")}>下载</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("组织架构文字说明已复制（示意）")}>一键复制</Button>
                    </div>
                    <textarea className="h-16 w-full rounded border p-2" placeholder="组织架构说明..." />
                  </CardContent>
                </Card>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setQualificationView("credit")}>信用证明查询链接</Button>
                <Badge variant="outline">其他内容：资质补充说明、合作客户列表</Badge>
              </div>
            </div>
          )}

          {activeCategory === "qualification" && qualificationView === "upload" && (
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => setQualificationView("main")}>返回企业资质主页</Button>
              <Card className="bg-slate-50">
                <CardHeader className="pb-2"><CardTitle className="text-sm">资质上传页面</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <Input placeholder="资质名称" />
                  <Input placeholder="资质编号" />
                  <Input placeholder="发证日期" />
                  <Input placeholder="到期日" />
                  <Button className="col-span-2" onClick={() => handleGenericUpload("资质图片上传并保存成功", "image/*,.pdf", true)}>上传资质图片（JPG/PNG/PDF）并保存</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeCategory === "qualification" && qualificationView === "credit" && (
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => setQualificationView("main")}>返回企业资质主页</Button>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">信用证明官方链接</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <a className="block text-blue-700 hover:underline" href="https://www.creditchina.gov.cn/" target="_blank" rel="noreferrer">信用中国（企业无失信记录）</a>
                  <a className="block text-blue-700 hover:underline" href="https://www.ccgp.gov.cn/" target="_blank" rel="noreferrer">中国政府采购网（采购信用记录）</a>
                  <a className="block text-blue-700 hover:underline" href="https://www.gsxt.gov.cn/" target="_blank" rel="noreferrer">国家企业信用信息公示系统（工商合规）</a>
                  <a className="block text-blue-700 hover:underline" href="http://www.pbccrc.org.cn/" target="_blank" rel="noreferrer">人民银行征信中心（征信能力）</a>
                  <a className="block text-blue-700 hover:underline" href="https://cx.cnca.cn/" target="_blank" rel="noreferrer">资质认证查询平台（证书真伪）</a>
                </CardContent>
              </Card>
            </div>
          )}

          {activeCategory === "performance" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleGenericUpload("Excel导入成功", ".xls,.xlsx")}>Excel导入</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("已打开新增项目弹窗（示意）")}>新增项目</Button>
                  <Button variant="outline" size="sm" onClick={() => toast.success("已下载Excel导入模板（示意）")}>
                    下载模板
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input className="h-8 w-40" placeholder="关键词搜索" />
                  <select className="h-8 rounded border px-2 text-xs"><option>产品模块筛选</option><option>一表通</option><option>1104</option></select>
                  <select className="h-8 rounded border px-2 text-xs"><option>项目经理筛选</option><option>周芷若</option><option>王芳</option></select>
                  <Input className="h-8 w-32" placeholder="产品版本筛选" />
                  <Input className="h-8 w-36" placeholder="时间范围筛选" />
                </div>
              </div>
              <TableBox
                heads={["项目名称", "合同编号", "签署日期", "是否验收", "合同执行状态", "客户名称", "产品版本", "产品模块", "项目金额", "项目经理", "操作"]}
                rows={[
                  ["监管报送平台", "HT-2026-001", "2026-01-02", "是", "进行中", "XX 银行", "NUPS", "1104,一表通", "¥320万", "周芷若", "编辑 / 删除"],
                  ["数据质量平台", "HT-2026-002", "2026-01-16", "否", "已验收", "XX 金租", "UPS", "一表通", "¥180万", "王芳", "编辑 / 删除"],
                ]}
              />
            </div>
          )}

          {activeCategory === "solution" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">支持普通上传（多文件）与整体上传（AI提取技术方案）</p>
              <div className="rounded border border-dashed bg-slate-50 p-8 text-center text-sm">
                技术方案上传区（支持单文件/多文件，支持关联项目与产品模块）
              </div>
              {solutionUploadedFiles.length > 0 && (
                <div className="text-xs text-slate-600">已读取本地文件：{solutionUploadedFiles.join("，")}</div>
              )}
              <TableBox
                heads={["方案名称", "关联项目", "产品模块", "产品版本", "上传时间", "操作"]}
                rows={[["监管系统总体方案", "银行监管报送平台", "1104", "NUPS", "2026-03-08", "预览 / 下载 / 编辑 / 删除"]]}
              />
            </div>
          )}

          {activeCategory === "archive" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <Input className="h-8 w-32" placeholder="项目名称" />
                <Input className="h-8 w-32" placeholder="客户名称" />
                <Input className="h-8 w-32" placeholder="机构类型" />
                <Button size="sm" variant="outline" onClick={() => toast.success("归档查询已执行（示意）")}>查询</Button>
              </div>
              <TableBox
                heads={["项目名称", "客户名称", "机构类型", "采购模块", "标书是否收费", "上传人", "上传时间", "操作", "是否中标"]}
                rows={[["银行监管报送平台", "XX银行", "城商行", "1104", "否", "周芷若", "2026-03-09", "预览/下载/删除", "进行中"]]}
              />
              <div className="pt-2">
                <BidLibraryManager library={libraryItems} onLibraryUpdate={onLibraryUpdate} />
              </div>
            </div>
          )}

          {activeCategory === "winning" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="中标时间（YYYY-MM-DD）" />
                <Input placeholder="中标结束时间" />
              </div>
              <div className="rounded border border-dashed bg-slate-50 p-8 text-center text-sm">
                中标标书上传区（支持单文件/多文件）
              </div>
              <TableBox
                heads={["项目名称", "客户名称", "机构类型", "采购模块", "中标时间", "上传人", "上传时间", "操作"]}
                rows={[["省级政务云平台", "XX 大数据局", "政务", "云平台", "2025-12-20", "王芳", "2026-03-09 10:21", "预览 / 删除"]]}
              />
            </div>
          )}

          {activeCategory === "resume" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => resumeUploadInputRef.current?.click()}
                >
                  上传简历
                </Button>
                <Button size="sm" variant="outline" onClick={() => setResumeTemplateDialog(true)}>
                  上传简历模板
                </Button>
                {resumeUploadProgress > 0 && <Badge variant="outline">上传进度 {resumeUploadProgress}%</Badge>}
              </div>
              <TableBox
                heads={["简历名称", "上传时间", "上传人", "操作"]}
                rows={[
                  ["周芷若-项目经理.docx", "2026-03-09 10:20", "周芷若", resumeExtractReady ? "更新 / 提取信息 / 删除" : "更新 / 提取信息(未解锁) / 删除"],
                  ["王芳-商务经理.pdf", "2026-03-09 10:40", "王芳", resumeExtractReady ? "更新 / 提取信息 / 删除" : "更新 / 提取信息(未解锁) / 删除"],
                ]}
              />
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="人员名称" />
                <Input placeholder="实施模块" />
                <Input placeholder="毕业院校" />
                <Button size="sm" variant="outline" onClick={() => toast.success("简历查询已执行（示意）")}>查询</Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setResumeDialog(true)} disabled={!resumeExtractReady}>提取信息</Button>
                <Badge variant="outline">提取字段：人员名称、实施模块、毕业院校、项目时间、项目角色、项目名称</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resumeDialog} onOpenChange={setResumeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>简历信息提取结果</DialogTitle>
            <DialogDescription>依托大模型提取结果，按单行字段保存到简历信息表。</DialogDescription>
          </DialogHeader>
          <TableBox
            heads={["人员名称", "毕业院校", "项目开始", "项目结束", "项目角色", "项目名称"]}
            rows={[["周芷若", "XX大学", "2023-01", "2024-12", "项目经理", "监管报送平台"]]}
          />
          <DialogFooter>
            <Button onClick={() => setResumeDialog(false)}>确认保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resumeTemplateDialog} onOpenChange={setResumeTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>简历模板填充</DialogTitle>
            <DialogDescription>上传 Word 模板后，筛选人员并自动填充，支持下载。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button size="sm" onClick={() => handleGenericUpload("Word模板上传成功", ".doc,.docx")}>上传简历模板（Word）</Button>
            <select className="h-9 w-full rounded border px-2 text-sm">
              <option>筛选人员：周芷若</option>
              <option>筛选人员：王芳</option>
            </select>
            <Button onClick={() => toast.success("模板已填充并开始下载（示意）")}>自动填充并下载模板</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeTemplateDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 基础信息：左半边结构化信息 + 右半边招标原文（参考文档解析界面） */
function TenderBasicInfoPanel() {
  const [basicSubTab, setBasicSubTab] = useState<"tender" | "project" | "time" | "other" | "purchase">("tender");
  const basicSubTabs = [
    { value: "tender" as const, label: "招标人/代理信息" },
    { value: "project" as const, label: "项目信息" },
    { value: "time" as const, label: "关键时间/内容" },
    { value: "other" as const, label: "其他信息" },
    { value: "purchase" as const, label: "采购要求" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 左半边：结构化信息 */}
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
        <Tabs value={basicSubTab} onValueChange={(v) => setBasicSubTab(v as typeof basicSubTab)} className="flex-1">
          <TabsList className="mb-3 w-full justify-start rounded-[8px] bg-[#F0F2F5] p-1">
            {basicSubTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="mb-3 text-xs text-[#909399]">以下内容由AI生成，内容仅供参考，请仔细甄别。</p>
          <TabsContent value="tender" className="mt-0 space-y-4">
            <div>
              <p className="tender-fixed-label mb-1 text-sm">招标人</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">招标人联系方式</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>名称</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>联系电话</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>地址</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>网址</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>商务联系人</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>技术联系人</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>电子邮件</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">项目联系方式</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">名称</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">联系电话</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>项目联系人</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="project" className="mt-0 space-y-4">
            <div>
              <p className="tender-fixed-label mb-1 text-sm">项目编号</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">项目基本情况</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>项目编号</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>项目概况与招标范围</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">招标控制价</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">是否接受联合体投标</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
          </TabsContent>
          <TabsContent value="time" className="mt-0 space-y-4">
            <div>
              <p className="tender-fixed-label mb-1 text-sm">投标文件递交截止日期</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">投标文件递交地点</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">开标时间</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">开标地点</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">澄清招标文件的截止时间</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">投标有效期</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">信息公示媒介</p>
              <div className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</div>
            </div>
          </TabsContent>
          <TabsContent value="other" className="mt-0 space-y-4">
            <div>
              <p className="tender-fixed-label mb-1 text-sm">投标费用承担</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">是否退还投标文件</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">偏离</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">评标办法</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">定标方法</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
          </TabsContent>
          <TabsContent value="purchase" className="mt-0 space-y-4">
            <p className="tender-fixed-label text-sm">第四章 技术服务要求</p>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">11. 采购背景</p>
              <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
            </div>
            <div>
              <p className="tender-fixed-label mb-1 text-sm">12. 系统功能要求</p>
              <div className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] p-3">
                <div className="mt-2 overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="tender-fixed-label text-[#303133]">序号</TableHead>
                        <TableHead className="tender-fixed-label text-[#303133]">功能模块</TableHead>
                        <TableHead className="tender-fixed-label text-[#303133]">要求说明</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell>1</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                      <TableRow><TableCell>2</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <TenderDocOutlinePanel />
    </div>
  );
}

/** 资格要求：左半边 资格性和符合性审查 + 资质条目，右半边招标原文 */
function TenderQualifyPanel() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
        <p className="mb-3 text-xs text-[#909399]">以下内容由AI生成，内容仅供参考，请仔细甄别。</p>
        <div className="rounded-[8px] border border-[#E4E7ED] bg-white p-4">
          <Button className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]" onClick={() => toast.success("资格性和符合性审查（示意）")}>
            资格性和符合性审查
          </Button>
        </div>
        <ul className="mt-4 space-y-3">
          <li className="tender-fixed-label rounded-[8px] border border-[#E4E7ED] px-3 py-2 text-sm text-[#303133]">有效的营业执照</li>
          <li className="tender-fixed-label rounded-[8px] border border-[#E4E7ED] px-3 py-2 text-sm text-[#303133]">近三年未被列入国家企业信用信息公示系统经营异常名录和严重违法失信企业名单</li>
          <li className="tender-fixed-label rounded-[8px] border border-[#E4E7ED] px-3 py-2 text-sm text-[#303133]">具有计算机软件开发相应的经营范围</li>
        </ul>
      </div>
      <TenderDocOutlinePanel />
    </div>
  );
}

/** 评审要求：子项 评分标准/开标/评标/定标/中标要求 */
function TenderReviewPanel() {
  const [reviewSubTab, setReviewSubTab] = useState<"score" | "open" | "eval" | "decide" | "win">("score");
  const reviewSubTabs = [
    { value: "score" as const, label: "评分标准" },
    { value: "open" as const, label: "开标" },
    { value: "eval" as const, label: "评标" },
    { value: "decide" as const, label: "定标" },
    { value: "win" as const, label: "中标要求" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
        <p className="mb-3 text-xs text-[#909399]">以下内容由AI生成，内容仅供参考，请仔细甄别。</p>
        <Tabs value={reviewSubTab} onValueChange={(v) => setReviewSubTab(v as typeof reviewSubTab)} className="flex-1">
          <TabsList className="mb-3 w-full justify-start rounded-[8px] bg-[#F0F2F5] p-1">
            {reviewSubTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="score" className="mt-0">
            <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="tender-fixed-label text-[#303133]">序号</TableHead>
                    <TableHead className="tender-fixed-label text-[#303133]">主要内容</TableHead>
                    <TableHead className="tender-fixed-label text-[#303133]">分值</TableHead>
                    <TableHead className="tender-fixed-label text-[#303133]">评分标准</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>1</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  <TableRow><TableCell>2</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  <TableRow><TableCell>3</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="open" className="mt-0 space-y-4">
            <InfoCard title="提交截止时间" content="—" />
            <InfoCard title="提交地点" content="—" />
            <InfoCard title="接收人" content="—" />
            <InfoCard title="联系方式" content="—" />
            <InfoCard title="拒收情形" content="—" />
          </TabsContent>
          <TabsContent value="eval" className="mt-0 space-y-4">
            <InfoCard title="评标原则" content="—" />
            <InfoCard title="评标办法" content="—" />
            <InfoCard title="中标候选人确定规则" content="—" />
            <InfoCard title="废标情形(技术标)" content="—" />
            <InfoCard title="报价有效性要求" content="—" />
          </TabsContent>
          <TabsContent value="decide" className="mt-0 space-y-4">
            <InfoCard title="定标主体与依据" content="—" />
            <InfoCard title="定标结果通知" content="—" />
          </TabsContent>
          <TabsContent value="win" className="mt-0 space-y-4">
            <InfoCard title="中标通知书效力" content="—" />
            <InfoCard title="合同签订时限与地点" content="—" />
            <InfoCard title="合同签订依据" content="—" />
            <InfoCard title="履约禁止性要求" content="—" />
          </TabsContent>
        </Tabs>
      </div>
      <TenderDocOutlinePanel />
    </div>
  );
}

function InfoCard({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="tender-fixed-label mb-1 text-sm">{title}</p>
      <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#606266]">{content}</p>
    </div>
  );
}

/** 招标原文右侧面板：大纲 + 原文内容（复用） */
function TenderDocOutlinePanel() {
  return (
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
      <div className="border-b border-[#E4E7ED] px-4 py-3">
        <h4 className="tender-fixed-label text-sm">招标原文</h4>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="text-sm leading-relaxed text-[#303133]">
          <p className="tender-fixed-label mb-1 text-xs">大纲</p>
          <p className="mb-1">招标文件</p>
          <p className="mb-1 text-[#909399]">项目编号: —</p>
          <p className="mb-1 text-[#909399]">项目名称: —</p>
          <p className="mb-2 font-medium">▼ 第一章 投标邀请书</p>
          <p className="ml-2 mb-1 text-[#909399]">一、项目编号: —</p>
          <p className="ml-2 mb-1 text-[#909399]">二、项目名称: —</p>
          <p className="ml-2 mb-1 font-medium text-[#165DFF]">三、项目概况与招标范围</p>
          <p className="ml-2 mb-1">四、招标文件的获取</p>
          <p className="ml-2 mb-1">五、投标文件的提交</p>
          <p className="mb-2 font-medium">▼ 第二章 投标人须知</p>
          <p className="ml-2 mb-1">一、总则</p>
          <p className="ml-2 mb-1">二、招标文件</p>
          <p className="ml-2 mb-1">三、投标文件</p>
          <p className="ml-2 mb-1">四、投标</p>
        </div>
      </div>
    </div>
  );
}

/** 投标文件要求：子项 组成/编制/密封和标记/递交/修改与撤回/投标有效期 */
function TenderBidDocPanel() {
  const [bidDocSub, setBidDocSub] = useState<"compose" | "prep" | "seal" | "submit" | "modify" | "validity">("compose");
  const subTabs = [
    { value: "compose" as const, label: "投标文件的组成" },
    { value: "prep" as const, label: "投标文件的编制" },
    { value: "seal" as const, label: "投标文件的密封和标记" },
    { value: "submit" as const, label: "投标文件的递交" },
    { value: "modify" as const, label: "投标文件的修改与撤回" },
    { value: "validity" as const, label: "投标有效期" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
        <p className="mb-3 text-xs text-[#909399]">以下内容由AI生成，内容仅供参考，请仔细甄别。</p>
        <Tabs value={bidDocSub} onValueChange={(v) => setBidDocSub(v as typeof bidDocSub)} className="flex-1">
          <TabsList className="mb-3 w-full flex-wrap justify-start rounded-[8px] bg-[#F0F2F5] p-1">
            {subTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="compose" className="mt-0 space-y-4">
            <div>
              <p className="tender-fixed-label mb-2 text-sm">商务投标书</p>
              <ul className="space-y-1 text-sm text-[#909399]">
                <li>· —</li>
                <li>· —</li>
              </ul>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">技术投标书</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>投标函</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>资质文件及相关文件</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>技术投标方案</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="prep" className="mt-0 space-y-3 text-sm text-[#909399]">
            <p>—</p>
          </TabsContent>
          <TabsContent value="seal" className="mt-0 space-y-3 text-sm text-[#909399]">
            <p>—</p>
          </TabsContent>
          <TabsContent value="submit" className="mt-0 space-y-4">
            <InfoCard title="递交截止时间" content="—" />
            <InfoCard title="递交地点" content="—" />
            <InfoCard title="接收人" content="—" />
            <InfoCard title="联系方式" content="—" />
            <div>
              <p className="tender-fixed-label mb-1 text-sm">注意事项</p>
              <ul className="list-inside list-disc space-y-1 rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">
                <li>—</li>
              </ul>
            </div>
          </TabsContent>
          <TabsContent value="modify" className="mt-0 space-y-3 text-sm text-[#909399]">
            <p>—</p>
          </TabsContent>
          <TabsContent value="validity" className="mt-0">
            <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#909399]">—</p>
          </TabsContent>
        </Tabs>
        <div className="mt-4 flex items-center justify-between border-t border-[#E4E7ED] pt-4">
          <Button variant="outline" className="rounded-[8px]" onClick={() => toast.success("已导出解析报告（示意）")}>导出解析报告</Button>
          <Button className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]" onClick={() => toast.success("下一步（示意）")}>下一步</Button>
        </div>
      </div>
      <TenderDocOutlinePanel />
    </div>
  );
}

/** 无效标与废标项：子项 废标项/不得存在的情形/否决和无效投标情形 */
function TenderInvalidPanel() {
  const [invalidSub, setInvalidSub] = useState<"invalid" | "forbid" | "reject">("invalid");
  const subTabs = [
    { value: "invalid" as const, label: "废标项" },
    { value: "forbid" as const, label: "不得存在的情形" },
    { value: "reject" as const, label: "否决和无效投标情形" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
        <p className="mb-3 text-xs text-[#909399]">以下内容由AI生成，内容仅供参考，请仔细甄别。</p>
        <Tabs value={invalidSub} onValueChange={(v) => setInvalidSub(v as typeof invalidSub)} className="flex-1">
          <TabsList className="mb-3 w-full justify-start rounded-[8px] bg-[#F0F2F5] p-1">
            {subTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="invalid" className="mt-0 space-y-3 text-sm text-[#909399]">
            <p>—</p>
          </TabsContent>
          <TabsContent value="forbid" className="mt-0 space-y-3 text-sm text-[#909399]">
            <p>—</p>
          </TabsContent>
          <TabsContent value="reject" className="mt-0">
            <p className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] px-3 py-4 text-sm text-[#909399]">—</p>
          </TabsContent>
        </Tabs>
      </div>
      <TenderDocOutlinePanel />
    </div>
  );
}

/** 应标需提交文件：证明材料 + 清单 */
function TenderSubmitPanel() {
  const items = [
    "有效的营业执照",
    "国家企业信用信息公示系统经营异常名录和严重违法失信企业名单查询结果（近三年）",
    "CMMI3级及以上资质证书",
    "项目经理简历、社保证明（加盖公章）",
    "免费保修期承诺函（明确期限：1年/2年/3年及以上）",
    "软件著作权登记证书",
    "信创适配认证证书",
    "其他资质证书",
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
        <p className="mb-3 text-xs text-[#909399]">以下内容由AI生成，内容仅供参考，请仔细甄别。</p>
        <div className="mb-4">
          <Button className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]" onClick={() => toast.success("证明材料（示意）")}>证明材料</Button>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="tender-fixed-label rounded-[8px] border border-[#E4E7ED] px-3 py-2 text-sm text-[#303133]">{item}</li>
          ))}
        </ul>
      </div>
      <TenderDocOutlinePanel />
    </div>
  );
}

/** 招标文件审查：子项 条款风险/公平性审查风险 */
function TenderClausePanel() {
  const [clauseSub, setClauseSub] = useState<"term" | "fair">("term");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col rounded-[8px] border border-[#E4E7ED] bg-white">
        <p className="mb-3 text-xs text-[#909399]">以下内容由AI生成，内容仅供参考，请仔细甄别。</p>
        <Tabs value={clauseSub} onValueChange={(v) => setClauseSub(v as "term" | "fair")} className="flex-1">
          <TabsList className="mb-3 w-full justify-start rounded-[8px] bg-[#F0F2F5] p-1">
            <TabsTrigger value="term" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">条款风险(6)处</TabsTrigger>
            <TabsTrigger value="fair" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">公平性审查风险(4)处</TabsTrigger>
          </TabsList>
          <TabsContent value="term" className="mt-0 space-y-4">
            <div>
              <p className="tender-fixed-label mb-2 text-sm">保证金风险</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>退还风险</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>没收风险</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">付款条件风险</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>价格风险</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>付款时间风险</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">知识产权风险</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>知识产权风险</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">工期风险</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>工期风险</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="fair" className="mt-0 space-y-4">
            <div>
              <p className="tender-fixed-label mb-2 text-sm">准入公平性审查</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>特定地区/行业证书要求</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">得分公平性审查</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>联合体差异性得分</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">信用公平性审查</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>信用信息区别规定</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>限制使用信用评价</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                    <TableRow><TableCell>信用评价标准差异</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <p className="tender-fixed-label mb-2 text-sm">定标公平性审查</p>
              <div className="overflow-x-auto rounded-[8px] border border-[#E4E7ED]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="tender-fixed-label text-[#303133]">标题</TableHead>
                      <TableHead className="tender-fixed-label text-[#303133]">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="text-[#909399]">—</TableCell><TableCell className="text-[#909399]">—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <TenderDocOutlinePanel />
    </div>
  );
}

function TenderPage({
  uploadedTender,
  onUploadTender,
  parseProgress,
  isParsing,
  onParse,
  onGoCompliance,
  onNextStep,
  onAnalysisComplete,
}: {
  uploadedTender: { name: string; size: string; format: string } | null;
  onUploadTender: (v: { name: string; size: string; format: string }) => void;
  parseProgress: number;
  isParsing: boolean;
  onParse: () => void;
  onGoCompliance: () => void;
  onNextStep: () => void;
  onAnalysisComplete: (requirements: TenderRequirement[]) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">智能读标结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <TenderAnalyzer onAnalysisComplete={onAnalysisComplete} />
          </div>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="inline-flex h-9 w-full flex-wrap justify-start gap-1 rounded-[8px] bg-[#F0F2F5] p-1">
              <TabsTrigger value="basic" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                <span className="mr-1.5">基础信息</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </TabsTrigger>
              <TabsTrigger value="qualify" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                <span className="mr-1.5">资格要求</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </TabsTrigger>
              <TabsTrigger value="review" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                <span className="mr-1.5">评审要求</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </TabsTrigger>
              <TabsTrigger value="bidDoc" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                <span className="mr-1.5">投标文件要求</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </TabsTrigger>
              <TabsTrigger value="invalid" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                <span className="mr-1.5">无效标与废标项</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </TabsTrigger>
              <TabsTrigger value="submit" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                <span className="mr-1.5">应标需提交文件</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </TabsTrigger>
              <TabsTrigger value="clause" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">
                <span className="mr-1.5">招标文件审查</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </TabsTrigger>
            </TabsList>

            {/* 基础信息：左半边结构化信息 + 右半边招标原文 */}
            <TabsContent value="basic" className="mt-4">
              <TenderBasicInfoPanel />
            </TabsContent>
            <TabsContent value="qualify" className="mt-4">
              <TenderQualifyPanel />
            </TabsContent>
            <TabsContent value="review" className="mt-4">
              <TenderReviewPanel />
            </TabsContent>
            <TabsContent value="bidDoc" className="mt-4">
              <TenderBidDocPanel />
            </TabsContent>
            <TabsContent value="invalid" className="mt-4">
              <TenderInvalidPanel />
            </TabsContent>
            <TabsContent value="submit" className="mt-4">
              <TenderSubmitPanel />
            </TabsContent>
            <TabsContent value="clause" className="mt-4">
              <TenderClausePanel />
            </TabsContent>
          </Tabs>
          <div className="mt-4 flex items-center justify-between border-t border-[#E4E7ED] pt-4">
            <Button variant="outline" className="rounded-[8px]" onClick={() => toast.success("已导出解析报告（示意）")}>
              导出解析报告
            </Button>
            <Button className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]" onClick={onNextStep}>
              下一步
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-300">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-semibold text-red-700">风险预警：存在 2 项废标风险</p>
            <p className="text-xs text-slate-600">偏离项：资质有效期、盖章页完整性</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success("对标检查已开始（示意）")}>对标检查</Button>
            <Button onClick={onGoCompliance}>查看修改建议</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProposalPage({
  projectContext,
  onProjectContextUpdate,
}: {
  projectContext: ProjectContext;
  onProjectContextUpdate: (next: Partial<ProjectContext>) => void;
}) {
  const flatSections = proposalOutline.flatMap((g) => g.sections.map((s) => `${g.group}::${s.name}`));
  const [selectedGroup, setSelectedGroup] = useState(proposalOutline[0].group);
  const [selectedSection, setSelectedSection] = useState(proposalOutline[0].sections[0].name);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [otherFileUploaded, setOtherFileUploaded] = useState(false);
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalTab, setProposalTab] = useState<"tech" | "biz">("tech");
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [projectOutline, setProjectOutline] = useState(projectContext.tenderOutline);
  const selectedDetail =
    proposalOutline.find((g) => g.group === selectedGroup)?.sections.find((s) => s.name === selectedSection)?.detail ??
    "";

  useEffect(() => {
    setProjectOutline(projectContext.tenderOutline);
  }, [projectContext.tenderOutline]);

  useEffect(() => {
    onProjectContextUpdate({
      proposalCompletedSections: completedSections.length,
      proposalTotalSections: flatSections.length,
    });
  }, [completedSections, flatSections.length, onProjectContextUpdate]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <Input
            value={proposalSearch}
            onChange={(e) => setProposalSearch(e.target.value)}
            placeholder="搜索标书、模板、项目..."
            className="max-w-md rounded-[8px] border-[#E4E7ED]"
          />
          <Button variant="outline" className="rounded-[8px] border-[#E4E7ED]" onClick={() => toast.success("查询（示意）")}>
            查询
          </Button>
          <Button
            className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]"
            onClick={() => {
              onProjectContextUpdate({ tenderOutline: projectOutline || "（AI 生成大纲将在此展示）" });
              toast.success("已生成 AI 大纲");
            }}
          >
            AI 生成大纲
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-[#909399]">项目编号：—</span>
            <span className="text-sm font-medium text-[#303133]">金额：—</span>
          </div>
          <Tabs value={proposalTab} onValueChange={(v) => setProposalTab(v as "tech" | "biz")} className="w-full">
            <TabsList className="rounded-[8px] bg-[#F0F2F5] p-1">
              <TabsTrigger value="tech" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">技术标</TabsTrigger>
              <TabsTrigger value="biz" className="rounded-[8px] data-[state=active]:bg-[#165DFF] data-[state=active]:text-white">商务标</TabsTrigger>
            </TabsList>
            <p className="mt-2 text-xs text-red-600">以下内容由 AI 生成，内容仅供参考，请仔细甄别。生成内容将根据输出字数计费，图表不计入字数。</p>
            <TabsContent value="tech" className="mt-4 space-y-4">
              <div>
                <p className="tender-fixed-label mb-1 text-sm">招标文件项目需求</p>
                <div className="min-h-[80px] rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] p-3 text-sm text-[#909399]">待生成…</div>
              </div>
              <div>
                <p className="tender-fixed-label mb-2 text-sm">评审标准</p>
                <ul className="space-y-2 rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] p-4 text-sm text-[#606266]">
                  <li><span className="font-medium text-[#303133]">技术评分(30分)：</span> 系统功能方案(10分)、系统技术方案(20分) 等，由 AI 解析后填充。</li>
                  <li><span className="font-medium text-[#303133]">商务评分：</span> —</li>
                </ul>
              </div>
              <Button className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]" onClick={() => toast.success("生成技术标目录（示意）")}>
                生成技术标目录
              </Button>
            </TabsContent>
            <TabsContent value="biz" className="mt-4 space-y-4">
              <div>
                <p className="tender-fixed-label mb-1 text-sm">招标文件项目需求</p>
                <div className="min-h-[80px] rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] p-3 text-sm text-[#909399]">待生成…</div>
              </div>
              <div>
                <p className="tender-fixed-label mb-2 text-sm">评审标准</p>
                <div className="rounded-[8px] border border-[#E4E7ED] bg-[#FAFAFA] p-3 text-sm text-[#909399]">—</div>
              </div>
              <Button className="rounded-[8px] bg-[#165DFF] hover:bg-[#0F42C1]" onClick={() => toast.success("生成商务标（示意）")}>
                下一步
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[200px_1fr_200px] gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">章节导航</CardTitle>
          </CardHeader>
          <CardContent className="h-[430px] space-y-2 overflow-y-auto text-sm">
            {proposalOutline.map((group) => (
              <div key={group.group}>
                <button
                  className={`w-full rounded px-2 py-1 text-left font-semibold ${
                    selectedGroup === group.group ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100"
                  }`}
                  onClick={() => {
                    setSelectedGroup(group.group);
                    setSelectedSection(group.sections[0].name);
                  }}
                >
                  {group.group}
                </button>
                <div className="mt-1 space-y-1 pl-2">
                  {group.sections.map((section) => (
                    <button
                      key={section.name}
                      onClick={() => {
                        setSelectedGroup(group.group);
                        setSelectedSection(section.name);
                      }}
                      className={`block w-full rounded px-2 py-1 text-left text-xs ${
                        selectedSection === section.name ? "bg-slate-200 text-slate-900" : "hover:bg-slate-100"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {section.name}
                        {completedSections.includes(`${group.group}::${section.name}`) && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">编辑主体</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
                  复用历史标书内容
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.success("文本已优化（示意）")}>
                  优化表述
                </Button>
                <Button size="sm" onClick={() => toast.success("智能排版完成（示意）")}>智能排版</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-slate-500">
              当前章节：{selectedGroup} / {selectedSection}
            </p>
            <div className="h-[250px] rounded border bg-white p-3 text-sm text-slate-600">
              富文本编辑区（支持表格插入、图表生成、实时保存、历史版本恢复、PDF预览）。
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const key = `${selectedGroup}::${selectedSection}`;
                  if (!completedSections.includes(key)) {
                    setCompletedSections((prev) => [...prev, key]);
                    toast.success("章节已标记完成");
                  }
                }}
              >
                标记章节完成
              </Button>
              {completedSections.length === flatSections.length && <Button size="sm" onClick={() => toast.success("完整标书已生成（示意）")}>标书生成</Button>}
            </div>
            <div className="rounded border bg-slate-50 p-2 text-xs">
              <p className="mb-1 font-semibold text-slate-700">章节详细说明：</p>
              <p>- {selectedDetail}</p>
            </div>
            {selectedGroup === "四、其他必备文件" && (
              <div className="rounded border border-dashed bg-slate-50 p-3 text-xs">
                <p className="mb-2 font-semibold text-slate-700">其他必备文件（表单模式）</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleGenericUpload("其他必备文件上传成功", "*/*", false, () => setOtherFileUploaded(true))}>
                    上传
                  </Button>
                  <Button size="sm" disabled={!otherFileUploaded} onClick={() => toast.success("已生成其他必备文件表单内容（示意）")}>
                    生成
                  </Button>
                </div>
                <p className="mt-2 text-slate-500">
                  {otherFileUploaded ? "已上传文件，可生成自动补充内容。" : "请先上传文件再点击生成。"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">素材调用栏</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Input placeholder="精准检索素材" />
            <p className="rounded bg-slate-100 p-2">企业资质</p>
            <p className="rounded bg-slate-100 p-2">项目业绩</p>
            <p className="rounded bg-slate-100 p-2">技术方案</p>
            <p className="rounded bg-slate-100 p-2">中标案例</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>复用历史标书内容</DialogTitle>
            <DialogDescription>可多次选择不同历史标书，批量复用企业介绍、技术优势、业绩说明。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {["2025-金融监管平台标书", "2025-省级政务云平台标书", "2024-智慧园区一期标书"].map((item) => (
              <label key={item} className="flex items-center gap-2 rounded border p-2">
                <input type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                toast.success("历史内容已批量复用");
                setHistoryOpen(false);
              }}
            >
              确认复用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 个人中心：已完成任务、代办任务，均可跳转至项目协作 */
function PersonalCenterPage({
  onGoToCompleted,
  onGoToPending,
}: {
  onGoToCompleted: () => void;
  onGoToPending: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">个人中心</CardTitle>
          <p className="text-sm text-[#909399]">查看并跳转至已完成任务或代办任务</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              onGoToCompleted();
              toast.success("已跳转至项目协作");
            }}
            className="flex items-center gap-4 rounded-[12px] border border-[#E4E7ED] bg-white p-5 text-left transition-colors hover:border-[#165DFF] hover:bg-[#F5F9FF]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#303133]">已完成任务</p>
              <p className="mt-0.5 text-xs text-[#909399]">查看已完成的标书与协作任务，跳转至项目协作</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onGoToPending();
              toast.success("已跳转至项目协作");
            }}
            className="flex items-center gap-4 rounded-[12px] border border-[#E4E7ED] bg-white p-5 text-left transition-colors hover:border-[#165DFF] hover:bg-[#F5F9FF]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[#E8F0FF]">
              <ListChecks className="h-6 w-6 text-[#165DFF]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#303133]">代办任务</p>
              <p className="mt-0.5 text-xs text-[#909399]">查看待办与进行中的任务，跳转至项目协作</p>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function CollaborationPage({ role, projectContext }: { role: Role; projectContext: ProjectContext }) {
  type CollaborationTaskStatus = "待分配" | "进行中" | "已完成" | "已驳回";
  type Urgency = "高" | "中" | "低";
  type TaskAssignment = {
    userName: string;
    department: string;
    roleName: string;
    assignedAt: string;
    progress: string;
  };
  type TaskHistory = {
    at: string;
    status: string;
    note: string;
    operator: string;
  };
  type CollaborationTask = {
    id: string;
    name: string;
    projectName: string;
    taskType: string;
    requirement: string;
    createdAt: string;
    urgency: Urgency;
    sectionKey: string;
    status: CollaborationTaskStatus;
    assignments: TaskAssignment[];
    history: TaskHistory[];
  };
  type Staff = {
    id: string;
    name: string;
    department: string;
    role: string;
  };

  const can = roleActionPermissions[role];
  const isAdmin = role === "管理员";
  const [now, setNow] = useState(new Date());
  const [taskSearch, setTaskSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedRoleName, setSelectedRoleName] = useState("技术标制作人");
  const [customRole, setCustomRole] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [peoplePanelOpen, setPeoplePanelOpen] = useState(true);
  const [roles, setRoles] = useState<string[]>([
    "技术标制作人",
    "商务制作人",
    "初审人员",
    "复审人员",
    "机动人员",
  ]);
  const [staff] = useState<Staff[]>([
    { id: "u1", name: "周芷若", department: "交付一部", role: "技术标制作人" },
    { id: "u2", name: "王芳", department: "商务中心", role: "商务制作人" },
    { id: "u3", name: "赵强", department: "质量管理部", role: "初审人员" },
    { id: "u4", name: "李宁", department: "质量管理部", role: "复审人员" },
    { id: "u5", name: "陈涛", department: "交付二部", role: "机动人员" },
  ]);
  const [notificationLogs, setNotificationLogs] = useState<string[]>([]);
  const [tasks, setTasks] = useState<CollaborationTask[]>([
    {
      id: "t-1",
      name: "标书制作人员分配",
      projectName: projectContext.projectName,
      taskType: "人员分配",
      requirement: "为当前标书项目分配技术标/商务标制作人员。",
      createdAt: "2026-03-09 09:30:00",
      urgency: "高",
      sectionKey: "标书制作人员分配",
      status: "待分配",
      assignments: [],
      history: [{ at: "2026-03-09 09:30:00", status: "任务待分配", note: "任务创建", operator: "系统" }],
    },
    {
      id: "t-audit",
      name: "标书审核任务",
      projectName: projectContext.projectName,
      taskType: "审核",
      requirement: "对已提交的标书进行审核，可审核通过或驳回。",
      createdAt: "2026-03-09 09:35:00",
      urgency: "高",
      sectionKey: "标书审核任务",
      status: "待分配",
      assignments: [],
      history: [{ at: "2026-03-09 09:35:00", status: "任务待分配", note: "任务创建", operator: "系统" }],
    },
    {
      id: "t-2",
      name: "商务标-商务承诺",
      projectName: projectContext.projectName,
      taskType: "章节编写",
      requirement: "补全付款、违约责任、质保承诺，保持条款一致性。",
      createdAt: "2026-03-09 09:45:00",
      urgency: "中",
      sectionKey: "二、商务标::商务承诺",
      status: "进行中",
      assignments: [
        {
          userName: "王芳",
          department: "商务中心",
          roleName: "商务制作人",
          assignedAt: "2026-03-09 10:00:00",
          progress: "65%",
        },
      ],
      history: [
        { at: "2026-03-09 09:45:00", status: "任务待分配", note: "任务创建", operator: "系统" },
        { at: "2026-03-09 10:00:00", status: "任务进行中", note: "分配给 王芳（商务制作人）", operator: "管理员" },
      ],
    },
    {
      id: "t-3",
      name: "资信标-资格证明文件",
      projectName: projectContext.projectName,
      taskType: "资料准备",
      requirement: "完成营业执照、资质证书、信用证明上传与核验。",
      createdAt: "2026-03-09 10:05:00",
      urgency: "高",
      sectionKey: "一、资信标::资格证明文件",
      status: "已驳回",
      assignments: [
        {
          userName: "周芷若",
          department: "交付一部",
          roleName: "技术标制作人",
          assignedAt: "2026-03-09 10:10:00",
          progress: "45%",
        },
      ],
      history: [
        { at: "2026-03-09 10:05:00", status: "任务待分配", note: "任务创建", operator: "系统" },
        { at: "2026-03-09 10:10:00", status: "任务进行中", note: "分配给 周芷若（技术标制作人）", operator: "管理员" },
        { at: "2026-03-09 11:20:00", status: "审查驳回", note: "信用证明截图缺失，需补齐并重新提交。", operator: "初审人员" },
      ],
    },
  ]);
  const [selectedStaffForPanel, setSelectedStaffForPanel] = useState<string>(staff[0].id);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (d: Date) => {
    const pad = (v: number) => `${v}`.padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
      d.getSeconds(),
    )}`;
  };

  const statusVisual: Record<string, { text: string; colorClass: string }> = {
    资料上传成功: { text: "✅ 资料上传成功", colorClass: "text-green-700 bg-green-50 border-green-200" },
    标书提交成功: { text: "📤 标书提交成功", colorClass: "text-green-700 bg-green-50 border-green-200" },
    审查驳回: { text: "❌ 审查驳回", colorClass: "text-red-700 bg-red-50 border-red-200" },
    登录失败: { text: "🔒 登录失败", colorClass: "text-red-700 bg-red-50 border-red-200" },
    简历信息提取完成: { text: "📊 简历信息提取完成", colorClass: "text-green-700 bg-green-50 border-green-200" },
    任务待分配: { text: "⏳ 任务待分配", colorClass: "text-blue-700 bg-blue-50 border-blue-200" },
    任务进行中: { text: "🔄 任务进行中", colorClass: "text-blue-700 bg-blue-50 border-blue-200" },
    任务已完成: { text: "✅ 任务已完成", colorClass: "text-green-700 bg-green-50 border-green-200" },
  };

  const urgencyWeight: Record<Urgency, number> = { 高: 3, 中: 2, 低: 1 };
  const sortedPendingTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "待分配")
        .filter((t) => `${t.name}${t.projectName}${t.taskType}`.includes(taskSearch))
        .sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]),
    [taskSearch, tasks],
  );

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const filteredStaff = staff.filter((s) => `${s.name}${s.role}`.includes(staffSearch));
  const selectedStaff = staff.find((s) => s.id === selectedStaffId) ?? null;
  const panelStaff = staff.find((s) => s.id === selectedStaffForPanel) ?? staff[0];

  const myNameByRole: Record<Role, string> = {
    管理员: "admin",
    技术标制作人: "周芷若",
    商务制作人: "王芳",
    机动人员: "陈涛",
    初审人员: "赵强",
    复审人员: "李宁",
  };
  const myTasks = tasks.filter((t) => t.assignments.some((a) => a.userName === myNameByRole[role]));

  const pushNotification = (text: string) => {
    setNotificationLogs((prev) => [`${formatDateTime(new Date())} ${text}`, ...prev].slice(0, 30));
  };

  const updateTask = (taskId: string, next: (task: CollaborationTask) => CollaborationTask) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? next(task) : task)));
  };

  const handleAssign = () => {
    if (!can.assignTask) {
      toast.error("当前角色无任务分配权限");
      return;
    }
    if (!selectedTask || !selectedStaff || !selectedRoleName) {
      toast.error("请先选择任务、人员和角色");
      return;
    }
    const assignedAt = formatDateTime(new Date());
    updateTask(selectedTask.id, (task) => {
      const filtered = task.assignments.filter((a) => a.userName !== selectedStaff.name);
      return {
        ...task,
        status: "进行中",
        assignments: [
          ...filtered,
          {
            userName: selectedStaff.name,
            department: selectedStaff.department,
            roleName: selectedRoleName,
            assignedAt,
            progress: "0%",
          },
        ],
        history: [
          ...task.history,
          {
            at: assignedAt,
            status: "任务进行中",
            note: `分配给 ${selectedStaff.name}（${selectedRoleName}）`,
            operator: "管理员",
          },
        ],
      };
    });
    pushNotification(`任务通知已发送给 ${selectedStaff.name}：${selectedTask.name}`);
    toast.success("确认分配成功，任务状态已更新并通知人员");
  };

  const handleApprove = () => {
    if (!can.reviewTask || !selectedTask) {
      toast.error("当前角色无审查权限或未选择任务");
      return;
    }
    const nowText = formatDateTime(new Date());
    updateTask(selectedTask.id, (task) => ({
      ...task,
      status: "已完成",
      assignments: task.assignments.map((a) => ({ ...a, progress: "100%" })),
      history: [
        ...task.history,
        {
          at: nowText,
          status: "任务已完成",
          note: "审查通过，流转至下一节点",
          operator: role,
        },
        {
          at: nowText,
          status: "标书提交成功",
          note: "章节内容已归档",
          operator: "系统",
        },
      ],
    }));
    toast.success("任务已审查通过");
  };

  const handleReject = () => {
    if (!can.reviewTask || !selectedTask) {
      toast.error("当前角色无审查权限或未选择任务");
      return;
    }
    if (!rejectReason.trim()) {
      toast.error("请填写驳回原因");
      return;
    }
    const nowText = formatDateTime(new Date());
    updateTask(selectedTask.id, (task) => ({
      ...task,
      status: "已驳回",
      history: [
        ...task.history,
        {
          at: nowText,
          status: "审查驳回",
          note: rejectReason.trim(),
          operator: role,
        },
      ],
    }));
    setRejectReason("");
    setRejectOpen(false);
    toast.success("已驳回并记录留痕");
  };

  const addCustomRole = () => {
    const trimmed = customRole.trim();
    if (!trimmed) {
      return;
    }
    if (!roles.includes(trimmed)) {
      setRoles((prev) => [...prev, trimmed]);
      setSelectedRoleName(trimmed);
    }
    setCustomRole("");
  };

  const staffTasks = tasks.filter((task) => task.assignments.some((a) => a.userName === panelStaff.name));
  const groupedStaffTasks: Record<string, CollaborationTask[]> = {
    待完成: staffTasks.filter((t) => t.status === "待分配"),
    进行中: staffTasks.filter((t) => t.status === "进行中"),
    已完成: staffTasks.filter((t) => t.status === "已完成"),
    已驳回: staffTasks.filter((t) => t.status === "已驳回"),
  };

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">项目协作（我的任务）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              当前角色：{role}。仅展示本人被分配任务，无任务分配与人员管理权限。
            </p>
            {myTasks.length === 0 ? (
              <div className="rounded border bg-slate-50 p-4 text-sm text-slate-500">当前暂无分配给你的任务。</div>
            ) : (
              myTasks.map((task) => {
                const statusKey =
                  task.status === "待分配"
                    ? "任务待分配"
                    : task.status === "进行中"
                      ? "任务进行中"
                      : task.status === "已完成"
                        ? "任务已完成"
                        : "审查驳回";
                const visual = statusVisual[statusKey];
                return (
                  <div key={task.id} className="rounded border bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{task.name}</p>
                      <span className={`rounded border px-2 py-1 text-xs ${visual.colorClass}`}>{visual.text}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">关联项目：{task.projectName}</p>
                    <p className="text-xs text-slate-600">任务要求：{task.requirement}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">项目协助中心（管理员视角）</CardTitle>
            <Badge variant="outline">当前系统时间：{formatDateTime(now)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-[68%_32%] gap-4">
          <div className="space-y-4">
            {can.viewPending && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-sm">待处理任务（按紧急程度排序）</CardTitle>
                    <Input
                      className="h-8 w-56"
                      placeholder="搜索任务名称/ID/类型"
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                    />
                    <Button variant="outline" size="sm" className="h-8" onClick={() => toast.success("查询（示意）")}>
                      查询
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedPendingTasks.length === 0 ? (
                    <div className="rounded border bg-slate-50 p-3 text-xs text-slate-500">暂无待分配任务。</div>
                  ) : (
                    sortedPendingTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded border bg-white p-3 text-sm">
                        <div>
                          <p className="font-medium">{task.name}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            关联项目：{task.projectName} ｜ 类型：{task.taskType} ｜ 创建：{task.createdAt} ｜ 紧急：{task.urgency}
                          </p>
                        </div>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setPeoplePanelOpen(true);
                          }}
                        >
                          处理
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">任务处理与分配</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedTask ? (
                  <div className="rounded border border-dashed bg-slate-50 p-6 text-sm text-slate-500">
                    请从上方待处理任务中点击“处理”，进入任务分配页面。
                  </div>
                ) : selectedTask.id === "t-audit" ? (
                  <>
                    <div className="rounded border bg-slate-50 p-3 text-xs">
                      <p className="font-semibold text-slate-700">当前处理任务：标书审核任务</p>
                      <p className="mt-1">任务名称：{selectedTask.name}</p>
                      <p>关联项目：{selectedTask.projectName}</p>
                      <p>系统时间：{formatDateTime(now)}</p>
                    </div>
                    <div className="rounded border bg-white p-4 text-sm">
                      <p className="font-semibold text-slate-700 mb-2">已提交的任务</p>
                      <div className="space-y-2 rounded border border-dashed bg-slate-50 p-3 text-xs text-slate-600">
                        <p>· 技术标-总体技术方案（待审核）</p>
                        <p>· 商务标-商务承诺（待审核）</p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => { toast.success("审核通过"); updateTask("t-audit", (t) => ({ ...t, status: "已完成" })); setSelectedTaskId(""); }}>
                          审核通过
                        </Button>
                        <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => { setRejectOpen(true); }}>
                          审核驳回
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded border bg-slate-50 p-3 text-xs">
                      <p className="font-semibold text-slate-700">当前处理任务详情</p>
                      <p className="mt-1">任务名称：{selectedTask.name}</p>
                      <p>关联项目：{selectedTask.projectName}</p>
                      <p>任务要求：{selectedTask.requirement}</p>
                      <p>系统时间：{formatDateTime(now)}</p>
                    </div>

                    <div className="grid grid-cols-[35%_65%] gap-3">
                      <div className="space-y-2 rounded border bg-white p-3 text-xs">
                        <p className="font-semibold text-slate-700">任务状态展示区</p>
                        <p>
                          当前状态：
                          <span className="ml-1 rounded border px-2 py-0.5 text-[11px]">
                            {selectedTask.status === "待分配"
                              ? "⏳ 任务待分配"
                              : selectedTask.status === "进行中"
                                ? "🔄 任务进行中"
                                : selectedTask.status === "已完成"
                                  ? "✅ 任务已完成"
                                  : "❌ 审查驳回"}
                          </span>
                        </p>
                        <p>
                          分配进度：{selectedTask.assignments.length > 0 ? `${selectedTask.assignments.length} 人已分配` : "未分配"}
                        </p>
                        <div className="space-y-1">
                          {selectedTask.assignments.map((a) => (
                            <div key={`${a.userName}-${a.roleName}`} className="rounded bg-slate-50 p-2">
                              <p>{a.userName} / {a.roleName}</p>
                              <p className="text-slate-500">进度 {a.progress} ｜ {a.assignedAt}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded border bg-slate-50 p-2">
                          <p className="font-medium text-slate-600">任务完成状态留痕</p>
                          <div className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                            {selectedTask.history.map((h, idx) => {
                              const visual = statusVisual[h.status] ?? statusVisual["任务进行中"];
                              return (
                                <p key={`${h.at}-${idx}`} className={`rounded border px-2 py-1 ${visual.colorClass}`}>
                                  {h.at} ｜ {h.operator} ｜ {visual.text} ｜ {h.note}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 rounded border bg-white p-3 text-xs">
                        <p className="font-semibold text-slate-700">任务分配操作区</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="搜索人员（姓名/角色）"
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                          />
                          <select
                            className="h-9 rounded border px-2 text-sm"
                            value={selectedStaffId}
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                          >
                            <option value="">选择人员</option>
                            {filteredStaff.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}（{p.role}）
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <select
                            className="h-9 rounded border px-2 text-sm"
                            value={selectedRoleName}
                            onChange={(e) => setSelectedRoleName(e.target.value)}
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <Button variant="outline" onClick={addCustomRole}>新增自定义角色</Button>
                        </div>
                        <Input
                          placeholder="输入自定义角色名称，例如：资料专员"
                          value={customRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                        />

                        <div className="flex gap-2">
                          <Button onClick={handleAssign}>确认分配</Button>
                        </div>
                        <p className="text-slate-500">分配成功后系统将自动向被分配人员发送任务通知。</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">人员管理</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setPeoplePanelOpen((v) => !v)}>
                    {peoplePanelOpen ? "收起" : "展开"}
                  </Button>
                </div>
              </CardHeader>
              {peoplePanelOpen && (
                <CardContent className="space-y-2 text-xs">
                  {!can.managePeople ? (
                    <p className="text-slate-500">当前角色无人员管理权限。</p>
                  ) : (
                    <>
                      <Input
                        className="h-8"
                        placeholder="搜索姓名或角色"
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                      />
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {filteredStaff.map((p) => (
                          <button
                            key={p.id}
                            className={`block w-full rounded border px-2 py-2 text-left ${
                              selectedStaffForPanel === p.id ? "border-blue-300 bg-blue-50" : "hover:bg-slate-50"
                            }`}
                            onClick={() => setSelectedStaffForPanel(p.id)}
                          >
                            <p className="font-medium">{p.name}</p>
                            <p className="text-slate-500">{p.department} ｜ {p.role}</p>
                          </button>
                        ))}
                      </div>

                      <div className="rounded border bg-slate-50 p-2">
                        <p className="font-semibold text-slate-700">下属任务总览：{panelStaff.name}</p>
                        {Object.entries(groupedStaffTasks).map(([groupName, groupTasks]) => (
                          <div key={groupName} className="mt-2">
                            <p className="text-slate-600">{groupName}（{groupTasks.length}）</p>
                            <div className="mt-1 space-y-1">
                              {groupTasks.length === 0 ? (
                                <p className="text-slate-400">暂无任务</p>
                              ) : (
                                groupTasks.map((task) => (
                                  <div key={task.id} className="rounded border bg-white p-2">
                                    <p className="font-medium">{task.name}</p>
                                    <p className="text-slate-500">分配时间：{task.assignments.find((a) => a.userName === panelStaff.name)?.assignedAt ?? "未分配"}</p>
                                    <p className="text-slate-500">任务详情：{task.requirement}</p>
                                    <p className="text-slate-500">当前进度：{task.assignments.find((a) => a.userName === panelStaff.name)?.progress ?? "0%"}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">任务通知日志</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {notificationLogs.length === 0 ? (
                  <p className="text-slate-500">暂无通知记录</p>
                ) : (
                  notificationLogs.map((log) => (
                    <p key={log} className="rounded border bg-slate-50 px-2 py-1">
                      {log}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>填写驳回原因</DialogTitle>
            <DialogDescription>驳回后将自动写入任务历史留痕。</DialogDescription>
          </DialogHeader>
          <textarea
            className="h-24 w-full rounded-md border p-2 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入驳回原因..."
          />
          <DialogFooter>
            <Button onClick={handleReject}>提交驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompliancePage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">合规与质量控制</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="check">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="check">智能审查</TabsTrigger>
              <TabsTrigger value="score">对标评分</TabsTrigger>
              <TabsTrigger value="library">合规库查询</TabsTrigger>
            </TabsList>
            <TabsContent value="check" className="mt-3 rounded border p-3 text-sm">
              上传标书后自动检查格式、签字、盖章、附件完整性，并给出修改建议。
            </TabsContent>
            <TabsContent value="score" className="mt-3 rounded border p-3 text-sm">
              选择评分细则后自动模拟评标，输出得分和薄弱项。
            </TabsContent>
            <TabsContent value="library" className="mt-3 rounded border p-3 text-sm">
              可检索法规、行业标准、废标条款库，并显示更新时间。
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-sm">审查报告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            发现问题 4 项（高风险 2 项）
          </div>
          <p className="text-xs text-slate-600">资质有效期缺失证明；附件目录与正文引用不一致；盖章页分辨率不足。</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DataCenterPage({ projectContext }: { projectContext: ProjectContext }) {
  const [reviewText, setReviewText] = useState("落标原因：评分项“交付周期”失分较多，后续需提前优化甘特图与资源计划。");
  const [compPrice, setCompPrice] = useState("");
  const [compAdv, setCompAdv] = useState("");
  const [compWeak, setCompWeak] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<"rival" | "merged">("rival");
  const [selectedProject, setSelectedProject] = useState("银行监管报送平台");

  const projectRows = [
    { name: "银行监管报送平台", status: "进行中", bid: "进行中", start: "2026-02-01" },
    { name: "政务云升级项目", status: "已完成", bid: "中标", start: "2025-12-15" },
    { name: "医疗信息一体化", status: "已完成", bid: "未中标", start: "2025-11-20" },
  ];

  return (
    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="dashboard">看板页面</TabsTrigger>
        <TabsTrigger value="knowledge">知识库管理</TabsTrigger>
        <TabsTrigger value="review">投标复盘</TabsTrigger>
        <TabsTrigger value="rival">竞争对手分析</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">数据看板</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded border bg-slate-50 p-3 text-xs text-slate-700">
              项目上下文：{projectContext.projectName}，招标要求 {projectContext.tenderRequirements.length} 条，
              章节完成 {projectContext.proposalCompletedSections}/{projectContext.proposalTotalSections}
            </div>
            <div className="rounded border bg-white p-3">
              <div className="mb-2 flex gap-2 text-xs">
                <Badge variant="outline">历史项目总数</Badge>
                <Badge variant="outline">中标项目数</Badge>
              </div>
              <div className="flex h-36 items-end gap-2">
                {[10, 14, 13, 18, 21, 19, 24, 28].map((h, idx) => (
                  <div key={idx} className="w-6 rounded-t bg-[#1B365D]" style={{ height: `${h * 4}px` }} />
                ))}
                {[8, 9, 7, 12, 13, 11, 15, 16].map((h, idx) => (
                  <div key={`y-${idx}`} className="w-6 rounded-t bg-[#FFC107]" style={{ height: `${h * 4}px` }} />
                ))}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>项目状态</TableHead>
                  <TableHead>中标情况</TableHead>
                  <TableHead>启动时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.bid}</TableCell>
                    <TableCell>{row.start}</TableCell>
                    <TableCell>
                      <button
                        className="text-blue-700 hover:underline"
                        onClick={() => {
                          setSelectedProject(row.name);
                          setDetailMode(row.status === "进行中" ? "rival" : "merged");
                        }}
                      >
                        查看详情
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">项目详情联动：{selectedProject}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {detailMode === "rival" ? (
              <div className="col-span-2 space-y-2">
                <p className="text-xs text-slate-500">进行中项目自动跳转到竞争对手分析页面</p>
                <Input value={compPrice} onChange={(e) => setCompPrice(e.target.value)} placeholder="对手价格" />
                <Input value={compAdv} onChange={(e) => setCompAdv(e.target.value)} placeholder="对手优势" />
                <Input value={compWeak} onChange={(e) => setCompWeak(e.target.value)} placeholder="对手薄弱项" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">复盘描述</p>
                  <textarea className="h-28 w-full rounded border p-2 text-sm" value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">竞争对手分析</p>
                  <Input value={compPrice} onChange={(e) => setCompPrice(e.target.value)} placeholder="对手价格" />
                  <Input value={compAdv} onChange={(e) => setCompAdv(e.target.value)} placeholder="对手优势" />
                  <Input value={compWeak} onChange={(e) => setCompWeak(e.target.value)} placeholder="对手薄弱项" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="knowledge">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">知识库管理</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[220px_1fr] gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">分类管理</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="rounded bg-blue-100 px-2 py-1 text-blue-700">项目类型</p>
                <p className="rounded px-2 py-1 hover:bg-slate-100">中标状态</p>
                <p className="rounded px-2 py-1 hover:bg-slate-100">行业分类</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">知识列表</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="检索知识内容" />
                <TableBox
                  heads={["知识标题", "关联项目", "添加时间", "操作"]}
                  rows={[
                    ["监管报送平台-复盘", "银行监管报送平台", "2026-03-09", "编辑 / 删除 / 导出"],
                    ["政务云项目-中标经验", "政务云升级项目", "2026-02-20", "编辑 / 删除 / 导出"],
                  ]}
                />
                <Button size="sm" onClick={() => setAnalysisOpen(true)}>AI分析</Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="review">
        <Card>
          <CardHeader><CardTitle className="text-base">投标复盘</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <TableBox
              heads={["项目", "时间", "结果", "复盘描述"]}
              rows={[
                ["银行监管报送平台", "2026-03-01", "落标", "点击下方编辑详细复盘"],
                ["政务云升级项目", "2026-02-17", "中标", "技术方案完整度高"],
              ]}
            />
            <textarea className="h-24 w-full rounded-md border p-2 text-sm" value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rival">
        <Card>
          <CardHeader><CardTitle className="text-base">竞争对手分析</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input value={compPrice} onChange={(e) => setCompPrice(e.target.value)} placeholder="对手价格" />
            <Input value={compAdv} onChange={(e) => setCompAdv(e.target.value)} placeholder="对手优势" />
            <Input value={compWeak} onChange={(e) => setCompWeak(e.target.value)} placeholder="对手薄弱项" />
            <p className="text-xs text-slate-500">输入后自动保存，可随时编辑。</p>
          </CardContent>
        </Card>
      </TabsContent>

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI分析报告</DialogTitle>
            <DialogDescription>已基于配置模型完成中标/落标原因分析，并同步沉淀至知识库。</DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-slate-50 p-3 text-sm">
            建议重点优化响应完整性、实施周期论证和风险闭环说明；同时增强案例与评分项映射关系。
          </div>
          <DialogFooter>
            <Button onClick={() => setAnalysisOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

function DataCard({ title, value, trend, color }: { title: string; value: string; trend: string; color: string }) {
  return (
    <div className="rounded-[8px] bg-[#F0F2F5] p-3">
      <p className="text-xs text-[#909399]">{title}</p>
      <p className="mt-1 text-xl font-bold text-[#303133]">{value}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#909399]">{trend}</span>
        <div className="flex h-6 w-16 items-end gap-1">
          <span className={`h-2 w-2 rounded ${color}`} />
          <span className={`h-4 w-2 rounded ${color} opacity-80`} />
          <span className={`h-3 w-2 rounded ${color} opacity-60`} />
          <span className={`h-5 w-2 rounded ${color} opacity-40`} />
        </div>
      </div>
    </div>
  );
}

function TableBox({ heads, rows }: { heads: string[]; rows: string[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>{heads.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={`${row[0]}-${i}`}>
            {row.map((cell, idx) => <TableCell key={`${idx}-${cell}`}>{cell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default App;
