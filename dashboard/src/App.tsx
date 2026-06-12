import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  LayoutDashboard, 
  RefreshCcw, 
  MessageSquare,
  Search,
  CheckCircle2,
  History,
  Phone,
  ExternalLink,
  type LucideIcon
} from 'lucide-react';
import { supabase } from './lib/supabase';

// Types
interface Cliente {
  telefone: string;
  cliente_id: string;
  vendedor_id: number;
  vendedor_nome: string;
  ativo: boolean;
  updated_at: string;
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

// Componentes do Hub
const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
      active 
        ? 'bg-primary/10 text-primary shadow-glow border border-primary/20' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card: React.FC<CardProps> = ({ children, title, subtitle }) => (
  <div className="glass p-6 rounded-2xl flex flex-col gap-4">
    {(title || subtitle) && (
      <div>
        {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'yellow' }> = ({ children, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [stats, setStats] = useState({ totalRecents: 0, activeVendedores: 0 });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes_atendimento')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      const fetchedData = (data as Cliente[]) || [];
      setClientes(fetchedData);
      
      setStats({
        totalRecents: fetchedData.length,
        activeVendedores: new Set(fetchedData.map(c => c.vendedor_id)).size
      });
    } catch (err) {
      console.error('Erro fetching clientes:', err);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'clientes':
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-transparent border-b border-white/5 pb-6">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Gestão de Clientes</h1>
                <p className="text-gray-400 mt-1">Veja todos os dados sincronizados na nuvem.</p>
              </div>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por telefone..." 
                    className="bg-card border border-border px-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-64 text-sm"
                  />
                </div>
                <button onClick={fetchClientes} className="bg-primary hover:bg-primary-dark p-2.5 rounded-xl text-white transition-all">
                  <RefreshCcw size={20} />
                </button>
              </div>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-gray-400 text-[10px] uppercase tracking-wider">
                      <th className="py-4 px-2 font-medium">Telefone</th>
                      <th className="py-4 px-2 font-medium">Cliente ID</th>
                      <th className="py-4 px-2 font-medium">Vendedor</th>
                      <th className="py-4 px-2 font-medium">Status</th>
                      <th className="py-4 px-2 font-medium text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {clientes.map((c) => (
                      <tr key={c.telefone} className="border-b border-white/5 hover:bg-white/[0.02] group transition-colors">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-primary" />
                            <span className="font-mono text-gray-300">{c.telefone}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-gray-400">{c.cliente_id}</td>
                        <td className="py-4 px-2">
                           <div className="flex flex-col">
                              <span className="text-white font-medium">{c.vendedor_nome}</span>
                              <span className="text-[10px] text-gray-500">ID: {c.vendedor_id}</span>
                           </div>
                        </td>
                        <td className="py-4 px-2">
                          <Badge color={c.ativo ? 'green' : 'yellow'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </td>
                        <td className="py-4 px-2 text-right text-gray-500">
                           {new Date(c.updated_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      case 'dashboard':
      default:
        return (
          <div className="flex flex-col gap-10 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-500">API-NH Oracle Hub</h1>
              <p className="text-gray-400 text-lg">Integração Oracle e Chatwoot.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Sincronizados', value: stats.totalRecents, icon: CheckCircle2, sub: 'Clientes na nuvem', color: 'text-green-400' },
                { title: 'Vendedores', value: stats.activeVendedores, icon: Users, sub: 'Equipe comercial ativa', color: 'text-primary' },
                { title: 'API Up-time', value: '99,9%', icon: History, sub: 'Disponibilidade do core', color: 'text-blue-400' },
              ].map((stat) => (
                <Card key={stat.title}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                      <h4 className="text-3xl font-bold text-white mt-1">{stat.value}</h4>
                    </div>
                    <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">{stat.sub}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
               <div className="xl:col-span-2 space-y-6">
                  <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                    <History className="text-primary" size={20} />
                    Logs de Roteamento Recentes
                  </h3>
                  <div className="space-y-3">
                    {[
                      { phone: '+551199XXX-XXXX', vendor: 'Vendedor 101', status: 'Sucesso' as const, time: '5m ago' },
                      { phone: '+552199XXX-XXXX', vendor: 'Fila Padrão', status: 'Fallback' as const, time: '12m ago' },
                      { phone: '+554199XXX-XXXX', vendor: 'Vendedor 202', status: 'Sucesso' as const, time: '20m ago' },
                    ].map((log, i) => (
                      <div key={i} className="glass p-4 rounded-xl flex items-center justify-between hover:border-white/20 transition-all border border-white/5 cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${log.status === 'Sucesso' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'}`} />
                          <div className="flex flex-col">
                             <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">{log.phone}</span>
                             <span className="text-xs text-gray-500">{log.vendor}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge color={log.status === 'Sucesso' ? 'green' : 'yellow'}>{log.status}</Badge>
                          <span className="text-xs text-gray-600">{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               <Card title="Status do Sync Local" subtitle="Monitoramento do serviço na premissa.">
                  <div className="space-y-6 mt-4">
                     <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-sm font-medium text-gray-400">Próxima sync em:</span>
                           <span className="font-mono text-primary animate-pulse">45m</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                           <div className="w-1/4 bg-primary h-full rounded-full" />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] text-gray-500 uppercase">IP Local</span>
                           <span className="text-xs text-white font-mono">192.168.0.50</span>
                        </div>
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] text-gray-500 uppercase">DB Status</span>
                           <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle2 size={10} /> Online
                           </span>
                        </div>
                     </div>

                     <button className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium text-sm flex items-center justify-center gap-2 text-white">
                        <RefreshCcw size={14} /> Rodar Sync Agora
                     </button>
                  </div>
               </Card>
            </div>
          </div>
        );
      case 'config':
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Configurações do Centro de Integração</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card title="Chatwoot Cloud" subtitle="Conexão com a Plataforma Comercial.">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Account ID</label>
                    <input type="text" className="w-full mt-1 bg-card border border-border p-3 rounded-xl text-sm focus:ring-primary focus:ring-1 outline-none" value="101" readOnly />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Webhook URL</label>
                    <div className="flex gap-2">
                       <input type="text" className="flex-1 mt-1 bg-card border border-border p-3 rounded-xl text-xs text-primary font-mono truncate" value="https://api.myapp.com/webhook/chatwoot" readOnly />
                       <button className="p-3 mt-1 glass rounded-xl hover:bg-white/5 transition-all outline-none">
                          <ExternalLink size={14} className="text-white" />
                       </button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Fallback & Regras" subtitle="Ajustes de roteamento condicional.">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-white">Fila de Emergência</h4>
                      <p className="text-[10px] text-gray-500">ID usado quando vendedor está inativo.</p>
                    </div>
                    <input type="number" className="w-20 bg-card border border-border p-2 rounded-lg text-sm text-white" defaultValue="999" />
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <div>
                      <h4 className="text-sm font-medium text-white">Auto Assignment</h4>
                      <p className="text-[10px] text-gray-500">Atribuir conversa assim que houver match.</p>
                    </div>
                    <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                       <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            <Card title="Documentação de Variáveis de Ambiente" subtitle="Copie os campos abaixo para o arquivo .env do seu serviço local (Módulo de Extração).">
              <div className="bg-background/50 p-4 rounded-2xl border border-white/[0.03] space-y-3 font-mono text-xs">
                <p className="text-gray-400">SUPABASE_URL=https://xy...supabase.co</p>
                <p className="text-gray-400">CHATWOOT_TOKEN=tok_...xyz</p>
                <p className="text-gray-400">ID_FILA_PADRAO_VENDEDOR=999</p>
                <p className="text-primary mt-4"># Estas chaves já foram integradas à nuvem.</p>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-border bg-[#0d0d12] flex flex-col p-6 fixed inset-y-0 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl">
            <RefreshCcw size={22} className="animate-spin-[10s_linear_infinite]" />
          </div>
          <div>
             <span className="font-extrabold text-xl tracking-tight text-white block leading-tight uppercase">Novo Horizonte</span>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Intelligence Hub</span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Início" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Users} 
            label="Clientes ERP" 
            active={activeTab === 'clientes'} 
            onClick={() => setActiveTab('clientes')} 
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Conversas" 
            active={activeTab === 'conversas'}
            onClick={() => setActiveTab('conversas')}
          />
          <SidebarItem 
            icon={Settings} 
            label="Configuração" 
            active={activeTab === 'config'} 
            onClick={() => setActiveTab('config')} 
          />
        </nav>

        <div className="mt-auto bg-card/50 p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                <CheckCircle2 size={16} />
             </div>
             <div>
                <span className="text-xs font-bold text-white block">Status OK</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-tight">Sync Ativo</span>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 pl-72 min-h-screen relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/5 blur-[100px] rounded-full -ml-24 -mb-24" />
        
        <div className="max-w-7xl mx-auto p-12 relative z-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
