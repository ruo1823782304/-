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
  Home,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  UploadCloud,
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

type AuthView = "login" | "register" | "forgot" | "maintenance";
type PageKey = "home" | "asset" | "tender" | "proposal" | "collaboration" | "data-center" | "compliance";
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

const navMenus: { key: PageKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "asset", label: "资料管理", icon: FolderOpen },
  { key: "tender", label: "招标处理", icon: FileCheck2 },
  { key: "proposal", label: "标书编制", icon: FileText },
  { key: "collaboration", label: "项目协作", icon: Users },
  { key: "data-center", label: "数据中心", icon: BarChart3 },
];

const rolePermissions: Record<Role, { pages: PageKey[]; description: string }> = {
  管理员: {
    pages: ["home", "asset", "tender", "proposal", "collaboration", "data-center", "compliance"],
    description: "可新建项目、任务分发、审查标书、查看全量进度",
  },
  技术标制作人: {
    pages: ["home", "asset", "tender", "proposal", "collaboration"],
    description: "负责技术标编制与提交，查看自身代办任务",
  },
  商务制作人: {
    pages: ["home", "asset", "tender", "proposal", "collaboration"],
    description: "负责商务标编制与提交，查看自身代办任务",
  },
  机动人员: {
    pages: ["home", "asset", "collaboration"],
    description: "配合技术/商务制作，查看自身代办任务",
  },
  初审人员: {
    pages: ["home", "collaboration", "compliance"],
    description: "负责初步审查，处理审查任务",
  },
  复审人员: {
    pages: ["home", "collaboration", "compliance"],
    description: "负责最终复审，处理终审任务",
  },
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
    { label: "上传资料", target: "asset", icon: UploadCloud },
    { label: "新建标书", target: "proposal", icon: FileText },
    { label: "解析招标文件", target: "tender", icon: FileCheck2 },
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
          toast.success("招标文件解析完成");
          return 100;
        }
        return prev + 20;
      });
    }, 220);
  };

  if (!isAuthed) {
    return (
      <div className="h-screen w-full overflow-hidden bg-white">
        <Toaster />
        <div className="grid h-full grid-cols-[45%_55%]">
          <section className="relative overflow-hidden bg-[#1B365D] text-white">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(120deg,rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(210deg,rgba(255,255,255,.25)_1px,transparent_1px)] bg-[size:42px_42px]" />
            <div className="absolute inset-y-0 left-[-10%] w-[120%] opacity-15 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,transparent_60%)]" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-10 text-center">
              <h1 className="text-[28px] font-bold">智慧标书·企业知识中枢</h1>
              <p className="mt-[10px] text-[16px]">沉淀投标智慧，赋能每一次竞标决策</p>
              <p className="mt-[20px] text-[18px] font-semibold text-[#FFC107]">智库引领，一击即中</p>
              <div className="mt-[30px] grid w-full max-w-[520px] grid-cols-3 gap-3">
                <InfoGlassCard title="标书数量" value="1268份" />
                <InfoGlassCard title="成功案例" value="326个" />
                <InfoGlassCard title="行业标准库" value="实时更新" />
              </div>
            </div>
          </section>

          <section className="relative flex items-center justify-center bg-white">
            <div className="w-[300px] rounded-xl border border-slate-200 bg-white p-6 shadow-md">
              {authView === "login" && (
                <div className="space-y-4">
                  <p className="text-center text-xl font-semibold text-[#1B365D]">账号登录</p>
                  <div className="space-y-2">
                    <Input
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="请输入用户名"
                      className="focus-visible:ring-[#1B365D]/30"
                    />
                    <div className="relative">
                      <Input
                        type={showPwd ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="请输入密码"
                        className="pr-9 focus-visible:ring-[#1B365D]/30"
                      />
                      <button
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute top-2.5 right-2 text-slate-500 hover:text-slate-700"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-1 text-slate-500">
                        <input type="checkbox" checked={rememberPwd} onChange={(e) => setRememberPwd(e.target.checked)} />
                        记住密码
                      </label>
                      <button className="text-[#1B365D] hover:text-[#10253f]" onClick={() => setAuthView("forgot")}>
                        忘记密码
                      </button>
                    </div>
                    {loginError && <p className="text-xs text-red-600">{loginError}</p>}
                  </div>
                  <Button className="h-10 w-full bg-[#1B365D] hover:bg-[#10253f] active:scale-[0.99]" onClick={doLogin}>
                    立即开启
                  </Button>
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <button className="text-[#1B365D] hover:text-[#10253f]" onClick={() => setAuthView("register")}>
                      账号注册
                    </button>
                    <span className="text-slate-300">|</span>
                    <button className="text-[#1B365D] hover:text-[#10253f]" onClick={() => setAuthView("maintenance")}>
                      账号维护
                    </button>
                  </div>
                </div>
              )}

              {authView === "register" && (
                <div className="space-y-3">
                  <p className="text-center text-lg font-semibold text-[#1B365D]">账号注册</p>
                  <Input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="用户名" />
                  <Input type="password" value={registerPwd} onChange={(e) => setRegisterPwd(e.target.value)} placeholder="密码" />
                  <Input
                    type="password"
                    value={registerConfirmPwd}
                    onChange={(e) => setRegisterConfirmPwd(e.target.value)}
                    placeholder="确认密码"
                  />
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value as Role)}
                    className="h-9 w-full rounded-md border px-2 text-sm"
                  >
                    {Object.keys(rolePermissions).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <Button className="w-full bg-[#1B365D] hover:bg-[#10253f]" onClick={doRegister}>
                    完成注册
                  </Button>
                  <button className="w-full text-xs text-[#1B365D]" onClick={() => setAuthView("login")}>
                    返回登录
                  </button>
                </div>
              )}

              {authView === "forgot" && (
                <div className="space-y-3">
                  <p className="text-center text-lg font-semibold text-[#1B365D]">密码重置</p>
                  <Input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="请输入用户名" />
                  <Input type="password" value={registerPwd} onChange={(e) => setRegisterPwd(e.target.value)} placeholder="请输入新密码" />
                  <Input
                    type="password"
                    value={registerConfirmPwd}
                    onChange={(e) => setRegisterConfirmPwd(e.target.value)}
                    placeholder="确认新密码"
                  />
                  <Button className="w-full bg-[#1B365D] hover:bg-[#10253f]" onClick={doResetPassword}>
                    重置密码
                  </Button>
                  <button className="w-full text-xs text-[#1B365D]" onClick={() => setAuthView("login")}>
                    返回登录
                  </button>
                </div>
              )}

              {authView === "maintenance" && (
                <div className="space-y-3">
                  <p className="text-center text-lg font-semibold text-[#1B365D]">账号维护</p>
                  <Input value={registerPwd} onChange={(e) => setRegisterPwd(e.target.value)} type="password" placeholder="请输入新密码" />
                  <Input
                    value={registerConfirmPwd}
                    onChange={(e) => setRegisterConfirmPwd(e.target.value)}
                    type="password"
                    placeholder="确认新密码"
                  />
                  <Button className="w-full bg-[#1B365D] hover:bg-[#10253f]" onClick={doMaintenance}>
                    保存维护信息
                  </Button>
                  <button className="w-full text-xs text-[#1B365D]" onClick={() => setAuthView("login")}>
                    返回登录
                  </button>
                </div>
              )}
            </div>

            <div className="absolute bottom-5 text-[11px] text-slate-400">
              技术支持：400-800-2026 | <button className="hover:text-[#1B365D]">隐私政策</button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Toaster />

      <header className="fixed top-0 z-50 h-[60px] w-full border-b bg-[#0f3d79] text-white">
        <div className="mx-auto flex h-full max-w-[1400px] items-center px-5">
          <button onClick={() => setActivePage("home")} className="flex w-[200px] items-center gap-2 text-left">
            <LayoutDashboard className="h-6 w-6" />
            <div>
              <p className="text-base font-semibold leading-5">智能标书库</p>
              <p className="text-xs text-blue-100">高效 · 便捷 · 合规</p>
            </div>
          </button>

          <Button
            variant="secondary"
            className="mr-2 h-8 w-[84px] bg-white/90 text-[#0f3d79] hover:bg-white"
            onClick={() => setActivePage("home")}
          >
            <Home className="mr-1 h-4 w-4" />
            首页
          </Button>

          <nav className="mx-1 flex flex-1 items-center justify-center gap-1">
            {navMenus
              .filter((menu) => pageVisible(menu.key))
              .map((menu) => {
                const Icon = menu.icon;
                const active = activePage === menu.key;
                return (
                  <button
                    key={menu.key}
                    onClick={() => setActivePage(menu.key)}
                    className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm ${
                      active ? "bg-white text-[#0f3d79]" : "text-blue-50 hover:bg-blue-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {menu.label}
                  </button>
                );
              })}
          </nav>

          <div className="relative mr-2 w-[250px]">
            <Search className="absolute top-2.5 left-2 h-4 w-4 text-slate-500" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="搜索资料/模板/项目/标书"
              className="h-9 border-0 bg-white pl-8 text-slate-900"
            />
            {suggestList.length > 0 && (
              <div className="absolute top-10 w-full rounded-md border bg-white p-1 shadow-lg">
                {suggestList.map((item) => (
                  <button
                    key={item}
                    className="block w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
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

          <Button
            variant="secondary"
            className="mr-2 h-8 w-[100px] bg-blue-50 text-[#0f3d79] hover:bg-blue-100"
            onClick={() => setConfigOpen(true)}
            title="配置"
          >
            <Settings2 className="mr-1 h-4 w-4" />
            配置
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-[150px] items-center justify-end gap-2 rounded px-2 py-1 hover:bg-blue-800">
                <Avatar className="h-7 w-7 border border-blue-100">
                  <AvatarFallback className="bg-blue-100 text-xs text-blue-900">
                    {session?.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{session?.username}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>个人中心</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAuthView("maintenance")}>个人设置</DropdownMenuItem>
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
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-[70px] pt-[72px]">
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
          <AssetPage activeCategory={activeAssetCategory} onCategoryChange={setActiveAssetCategory} />
        )}
        {activePage === "tender" && (
          <TenderPage
            uploadedTender={uploadedTender}
            onUploadTender={setUploadedTender}
            parseProgress={parseProgress}
            isParsing={isParsing}
            onParse={triggerParse}
            onGoCompliance={() => setActivePage("compliance")}
          />
        )}
        {activePage === "proposal" && <ProposalPage />}
        {activePage === "collaboration" && <CollaborationPage role={session?.role ?? "机动人员"} />}
        {activePage === "compliance" && <CompliancePage />}
        {activePage === "data-center" && <DataCenterPage />}
      </main>

      <footer className="fixed bottom-0 w-full border-t bg-slate-200/95 text-xs text-slate-600">
        <div className="mx-auto flex h-[50px] max-w-[1400px] items-center justify-between px-5">
          <span>系统版本：V1.2.0</span>
          <span>技术支持：400-800-2026 / support@bidding-ai.com</span>
          <div className="flex items-center gap-4">
            <button className="hover:text-blue-700">隐私政策</button>
            <button className="hover:text-blue-700">使用说明</button>
          </div>
        </div>
      </footer>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-3xl">
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
    </div>
  );
}

function InfoGlassCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/30 bg-white/12 p-3 text-left backdrop-blur-sm">
      <p className="text-xs text-white/85">{title}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
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
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <Card className="col-span-3 h-[400px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">项目进度看板</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => toast.success("已打开筛选条件（示意）")}>
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  筛选
                </Button>
                <select
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                  className="h-8 rounded border px-2 text-xs"
                >
                  {["全部", "信息化", "云平台", "金融", "安防", "医疗", "工业"].map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid h-[320px] grid-cols-4 gap-2">
            {[
              { title: "待启动", key: "pending" },
              { title: "进行中", key: "ongoing" },
              { title: "待审批", key: "review" },
              { title: "已完成", key: "done" },
            ].map((column) => (
              <div
                key={column.key}
                className="rounded bg-slate-50 p-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(column.key)}
              >
                <p className="mb-2 text-xs font-semibold text-slate-600">{column.title}</p>
                <div className="space-y-2">
                  {board[column.key].map((item) => (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={() => setDragMeta({ from: column.key, projectId: item.id })}
                      onClick={onProjectClick}
                      className="w-full rounded border bg-white p-2 text-left text-xs hover:border-blue-400"
                    >
                      <p className="line-clamp-1 font-medium">{item.name}</p>
                      <p className="mt-1 text-slate-500">负责人：{item.owner}</p>
                      <p className="text-slate-500">截止：{item.deadline}</p>
                      <p className="text-blue-700">进度：{item.progress}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-2 h-[400px]">
          <CardHeader>
            <CardTitle className="text-base">常用功能快捷入口</CardTitle>
          </CardHeader>
          <CardContent className="grid h-[320px] grid-cols-3 gap-3">
            {quickEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.label}
                  onClick={() => onQuickClick(entry.target)}
                  className="flex flex-col items-center justify-center rounded bg-[#1f5ca8] text-white hover:bg-[#154680]"
                >
                  <Icon className="mb-2 h-5 w-5" />
                  <span className="text-xs">{entry.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="h-[80px] border-red-300">
        <CardContent className="flex h-full items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-semibold text-red-700">风险提示</p>
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {risks.map((risk) => (
              <button
                key={risk.text}
                onClick={() => onRiskClick(risk.target)}
                className={`rounded px-2 py-1 text-xs ${
                  risk.level === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {risk.text}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="h-[150px]">
        <CardHeader className="pb-1">
          <CardTitle className="text-base">数据概览</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-3">
          <DataCard title="本月投标项目数" value="36" trend="+8%" color="bg-blue-500" />
          <DataCard title="中标率" value="41%" trend="+3.1%" color="bg-emerald-500" />
          <DataCard title="标书编制平均耗时" value="2.8天" trend="-0.6天" color="bg-violet-500" />
          <DataCard title="资料入库数量" value="1,286" trend="+125" color="bg-amber-500" />
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
}: {
  activeCategory: AssetCategory;
  onCategoryChange: (v: AssetCategory) => void;
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

function TenderPage({
  uploadedTender,
  onUploadTender,
  parseProgress,
  isParsing,
  onParse,
  onGoCompliance,
}: {
  uploadedTender: { name: string; size: string; format: string } | null;
  onUploadTender: (v: { name: string; size: string; format: string }) => void;
  parseProgress: number;
  isParsing: boolean;
  onParse: () => void;
  onGoCompliance: () => void;
}) {
  const [outlineText, setOutlineText] = useState("投标大纲：\n1. 商务响应要求...\n2. 技术响应要求...\n3. 评分项对应策略...");
  const [localFilePreview, setLocalFilePreview] = useState("");
  const uploadRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">招标文件上传（优化版）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-slate-500">仅支持上传 1 个 Word 文件</div>
          <input
            ref={uploadRef}
            type="file"
            accept=".doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onUploadTender({ name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)}MB`, format: file.name.split(".").pop()?.toUpperCase() || "DOCX" });
              const reader = new FileReader();
              reader.onload = () => setLocalFilePreview(String(reader.result ?? "").slice(0, 200));
              reader.readAsText(file);
              toast.success(`已读取本地文件：${file.name}`);
            }}
          />
          <div className="rounded-lg border border-dashed bg-slate-100/70 p-8 text-center backdrop-blur">
            <UploadCloud className="mx-auto mb-2 h-8 w-8 text-[#1B365D]" />
            <p className="text-sm text-slate-600">点击“上传文件”选择本地单个 Word 文件</p>
            <Button
              className="mt-3 bg-[#1B365D] hover:bg-[#10253f]"
              onClick={() => uploadRef.current?.click()}
            >
              上传文件
            </Button>
          </div>
          {localFilePreview && (
            <div className="rounded border bg-slate-50 p-2 text-xs text-slate-600">
              本地文件预览（前200字符）：{localFilePreview || "无法预览该文件内容"}
            </div>
          )}
          {uploadedTender && (
            <div className="flex items-center justify-between rounded border bg-white p-3 text-sm">
              <span>
                已上传：{uploadedTender.name} · {uploadedTender.size} · {uploadedTender.format}
              </span>
              <Button onClick={onParse}>解析</Button>
            </div>
          )}
          {(isParsing || parseProgress > 0) && (
            <div>
              <p className="mb-1 text-xs text-slate-500">解析进度：{parseProgress}%</p>
              <div className="h-2 rounded bg-slate-200">
                <div className="h-2 rounded bg-blue-600 transition-all" style={{ width: `${parseProgress}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">智能读标结果</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="req">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="req">需求清单</TabsTrigger>
              <TabsTrigger value="score">评分表</TabsTrigger>
              <TabsTrigger value="risk">废标条款</TabsTrigger>
              <TabsTrigger value="pay">付款条件</TabsTrigger>
              <TabsTrigger value="liability">违约责任</TabsTrigger>
              <TabsTrigger value="contract">合同条款</TabsTrigger>
              <TabsTrigger value="outline">投标大纲</TabsTrigger>
            </TabsList>
            <TabsContent value="req" className="mt-3 rounded border bg-yellow-50 p-3 text-sm">
              识别需求 42 项，支持复制与导出需求清单。
            </TabsContent>
            <TabsContent value="score" className="mt-3 rounded border bg-amber-50 p-3 text-sm">
              关键评分项 13 项，建议重点优化“实施团队经验”。
            </TabsContent>
            <TabsContent value="risk" className="mt-3 rounded border bg-red-50 p-3 text-sm">
              发现高风险废标条款 4 项，请逐项对标核查。
            </TabsContent>
            <TabsContent value="pay" className="mt-3 rounded border p-3 text-sm">
              付款条件：里程碑验收后分阶段支付。
            </TabsContent>
            <TabsContent value="liability" className="mt-3 rounded border p-3 text-sm">
              违约责任：交付延期与质量问题责任约定。
            </TabsContent>
            <TabsContent value="contract" className="mt-3 rounded border p-3 text-sm">
              合同条款：知识产权、保密、争议解决等条款。
            </TabsContent>
            <TabsContent value="outline" className="mt-3 space-y-2 rounded border p-3 text-sm">
              <textarea className="h-32 w-full rounded border p-2 text-xs" value={outlineText} onChange={(e) => setOutlineText(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => toast.success("投标大纲已保存")}>保存</Button>
                <Button size="sm" variant="outline" onClick={() => setOutlineText("投标大纲：\n1. 商务响应要求...\n2. 技术响应要求...\n3. 评分项对应策略...")}>重置</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success("已打开投标大纲预览（示意）")}>预览</Button>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(outlineText).then(() => toast.success("已复制投标大纲")).catch(() => toast.error("复制失败"))}>复制</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success("投标大纲已导出（示意）")}>导出</Button>
              </div>
            </TabsContent>
          </Tabs>
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

function ProposalPage() {
  const flatSections = proposalOutline.flatMap((g) => g.sections.map((s) => `${g.group}::${s.name}`));
  const [selectedGroup, setSelectedGroup] = useState(proposalOutline[0].group);
  const [selectedSection, setSelectedSection] = useState(proposalOutline[0].sections[0].name);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [otherFileUploaded, setOtherFileUploaded] = useState(false);
  const [positioning, setPositioning] = useState("银行监管报送平台-技术标");
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const selectedDetail =
    proposalOutline.find((g) => g.group === selectedGroup)?.sections.find((s) => s.name === selectedSection)?.detail ??
    "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">模板选择（优化版）</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <p className="text-sm font-medium">标书定位</p>
            <Input value={positioning} onChange={(e) => setPositioning(e.target.value)} placeholder="选择或搜索本次标书" />
          </div>
          {["中软融鑫定制模版-实施", "中软融鑫定制模版-产品销售"].map((item) => (
            <div key={item} className="rounded border bg-white p-3">
              <p className="font-medium">{item}</p>
              <Button size="sm" className="mt-2" onClick={() => toast.success(`已预览并应用模板：${item}`)}>
                预览并使用
              </Button>
            </div>
          ))}
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

function CollaborationPage({ role }: { role: Role }) {
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState("招标文件解析");
  const flowItems = [
    "招标文件解析",
    "人员分配",
    "分配人员完成情况",
    "商务标完成状态",
    "技术标完成状态",
    "审查结果",
    "标书定版状态",
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">项目协作（当前角色：{role}）</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => toast.success("已打开新建项目窗口（示意）")}>新建项目</Button>
              <Button size="sm" variant="outline" onClick={() => toast.success("已打开项目筛选条件（示意）")}>
                项目筛选
              </Button>
              <Button size="sm" onClick={() => toast.success("已打开任务分发面板（示意）")}>任务分发</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-[15%_85%] gap-3">
          <Card className="h-[260px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">已完成任务</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              {flowItems.map((item) => (
                <button
                  key={item}
                  className={`block w-full rounded px-1 py-1 text-left ${
                    selectedFlow === item ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100"
                  }`}
                  onClick={() => setSelectedFlow(item)}
                >
                  {item}
                </button>
              ))}
            </CardContent>
          </Card>
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">项目里程碑</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 rounded bg-slate-200">
                  <div className="h-2 w-[68%] rounded bg-blue-600" />
                </div>
                <p className="mt-2 text-xs text-slate-600">当前进度 68%（可拖拽调整任务进度）</p>
                <p className="mt-1 text-xs text-blue-700">当前联动节点：{selectedFlow}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">任务分配情况</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>角色</TableHead>
                      <TableHead>负责人</TableHead>
                      <TableHead>任务内容</TableHead>
                      <TableHead>进度</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>技术标制作人</TableCell><TableCell>周芷若</TableCell><TableCell>技术标编制</TableCell><TableCell>72%</TableCell></TableRow>
                    <TableRow><TableCell>商务制作人</TableCell><TableCell>王芳</TableCell><TableCell>商务标编制</TableCell><TableCell>63%</TableCell></TableRow>
                    <TableRow><TableCell>初审人员</TableCell><TableCell>赵强</TableCell><TableCell>初审校验</TableCell><TableCell>待开始</TableCell></TableRow>
                  </TableBody>
                </Table>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => toast.success("审查通过，进入下一流程（示意）")}>审查通过</Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)}>
                    审查不通过
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>填写驳回原因</DialogTitle>
          </DialogHeader>
          <textarea
            className="h-24 w-full rounded-md border p-2 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入驳回原因..."
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast.error("请填写驳回原因");
                  return;
                }
                toast.success("已驳回并退回修改");
                setRejectOpen(false);
                setRejectReason("");
              }}
            >
              提交
            </Button>
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

function DataCenterPage() {
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
    <div className="rounded border bg-white p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">{trend}</span>
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
