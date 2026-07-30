// import { Link } from 'react-router-dom';
// import {
//   FileText,
//   Users,
//   TrendingUp,
//   Plus,
//   ArrowRight,
//   Send,
//   CheckCircle,
//   Calendar,
//   LayoutDashboard,
//   Receipt
// } from 'lucide-react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { useApp } from '@/contexts/AppContext';
// import { formatCurrency } from '@/lib/types';
// import { format } from 'date-fns';
// import { NotificationBell } from "@/components/NotificationBell";

// export default function Dashboard() {
//   const { quotations, invoices } = useApp();

//   // Calculate KPIs
//   const activeQuotations = quotations.filter((q) => !q.is_template);

//   const ongoingProjects = activeQuotations.filter((q) => q.status === 'accepted' && !invoices.some((i) => i.quotation_id === q.id && i.invoice_status === 'paid')).length;
//   const pendingPayments = invoices.filter((i) => i.invoice_status !== 'paid').length;
//   const completedProjects = activeQuotations.filter((q) => invoices.some((i) => i.quotation_id === q.id && i.invoice_status === 'paid')).length;
//   const totalQuotations = quotations.filter(q => !q.is_template).length;
//   const sentQuotations = quotations.filter(q => q.status === 'sent' || q.status === 'accepted' || q.status === 'declined').length;
//   const acceptedQuotations = quotations.filter(q => q.status === 'accepted').length;
//   const conversionRate = sentQuotations > 0 ? Math.round((acceptedQuotations / sentQuotations) * 100) : 0;

//   const stats = [
//     {
//       label: 'Ongoing Projects',
//       value: ongoingProjects,
//       icon: Calendar,
//       color: 'text-foreground',
//     },
//     {
//       label: 'Pending Payments',
//       value: pendingPayments,
//       icon: Receipt,
//       color: 'text-amber-600',
//     },
//     {
//       label: 'Completed Projects',
//       value: completedProjects,
//       icon: CheckCircle,
//       color: 'text-green-500',
//     },
//     {
//       label: 'Total Quotations',
//       value: totalQuotations,
//       icon: FileText,
//       color: 'text-primary'
//     },
//     {
//       label: 'Sent Quotations',
//       value: sentQuotations,
//       icon: Send,
//       color: 'text-blue-500'
//     },
//     {
//       label: 'Accepted Quotations',
//       value: acceptedQuotations,
//       icon: CheckCircle,
//       color: 'text-green-500'
//     },
//     {
//       label: 'Conversion Rate',
//       value: `${conversionRate}%`,
//       icon: TrendingUp,
//       color: 'text-accent'
//     },
//   ];

//   const recentQuotations = quotations
//     .filter(q => !q.is_template)
//     .slice(0, 5);

//   const statusColors: Record<string, string> = {
//     draft: 'bg-muted text-muted-foreground',
//     sent: 'bg-primary/10 text-primary',
//     accepted: 'bg-green-100 text-green-700',
//     declined: 'bg-destructive/10 text-destructive',
//     expired: 'bg-muted text-muted-foreground',
//   };


//   return (
//     <div className="space-y-8 animate-fade-in">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-sm">
//             <LayoutDashboard className="w-6 h-6 text-white" strokeWidth={2} />
//           </div>
//           <div>
//             <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
//             <p className="text-muted-foreground mt-1">Welcome back! Here's your quotation overview.</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-3">
//           <NotificationBell />
//           <Link to="/quotations/new">
//             <Button className="font-heading gap-2 rounded-xl">
//               <Plus className="w-4 h-4" />
//               Create Quotation
//             </Button>
//           </Link>
//         </div>
//       </div>

//       {/* Stats Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         {stats.map((stat, index) => (
//           <Card key={index} className="glass-card card-hover">
//             <CardContent className="p-6">
//               <div className="flex items-start justify-between">
//                 <div className={`p-3 rounded-xl bg-secondary`}>
//                   <stat.icon className={`w-5 h-5 ${stat.color}`} />
//                 </div>
//               </div>
//               <div className="mt-4">
//                 <p className="text-3xl font-heading font-bold text-foreground">{stat.value}</p>
//                 <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       {/* Content Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Recent Quotations */}
//         <Card className="lg:col-span-2 glass-card">
//           <CardHeader className="flex flex-row items-center justify-between pb-4">
//             <CardTitle className="font-heading text-lg">Recent Quotations</CardTitle>
//             <Link to="/quotations">
//               <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:bg-black hover:text-white focus-visible:text-white cursor-pointer">
//                 View all <ArrowRight className="w-4 h-4" />
//               </Button>
//             </Link>
//           </CardHeader>
//           <CardContent>
//             {recentQuotations.length > 0 ? (
//               <div className="space-y-3">
//                 {recentQuotations.map((quote) => (
//                   <Link
//                     key={quote.id}
//                     to={`/quotations/${quote.id}/preview`}
//                     className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
//                   >
//                     <div className="flex items-center gap-4">
//                       <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
//                         <FileText className="w-5 h-5 text-primary" />
//                       </div>
//                       <div>
//                         <p className="font-medium text-foreground group-hover:text-primary transition-colors">
//                           {quote.client?.name || quote.client?.business_name || 'No client'}
//                         </p>
//                         <p className="text-sm text-muted-foreground">
//                           {quote.title || `Quote #${quote.quotation_number}`}
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-4">
//                       <div className="text-right">
//                         <p className="font-heading font-semibold text-foreground">
//                           {formatCurrency(quote.total, quote.currency)}
//                         </p>
//                         {quote.valid_until && (
//                           <p className="text-xs text-muted-foreground flex items-center gap-1">
//                             <Calendar className="w-3 h-3" />
//                             Valid: {format(new Date(quote.valid_until), 'MMM d, yyyy')}
//                           </p>
//                         )}
//                       </div>
//                       <Badge className={statusColors[quote.status]}>
//                         {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
//                       </Badge>
//                     </div>
//                   </Link>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-center py-12">
//                 <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
//                   <FileText className="w-8 h-8 text-muted-foreground" />
//                 </div>
//                 <p className="text-muted-foreground mb-4">No quotations yet</p>
//                 <Link to="/quotations/new">
//                   <Button variant="outline" className="gap-2 rounded-xl">
//                     <Plus className="w-4 h-4" /> Create your first quotation
//                   </Button>
//                 </Link>
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* Quick Actions */}
//         <Card className="glass-card">
//           <CardHeader className="pb-4">
//             <CardTitle className="font-heading text-lg">Quick Actions</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             <Link to="/quotations/new" className="block">
//               <div className="p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group cursor-pointer">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
//                     <Plus className="w-5 h-5 text-primary-foreground" />
//                   </div>
//                   <div>
//                     <p className="font-medium text-foreground">New Quotation</p>
//                     <p className="text-sm text-muted-foreground">Create a new quote</p>
//                   </div>
//                 </div>
//               </div>
//             </Link>
//             <Link to="/clients" className="block">
//               <div className="p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors group cursor-pointer">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
//                     <Users className="w-5 h-5 text-primary" />
//                   </div>
//                   <div>
//                     <p className="font-medium text-foreground">Add Client</p>
//                     <p className="text-sm text-muted-foreground">Register new client</p>
//                   </div>
//                 </div>
//               </div>
//             </Link>
//             <Link to="/analytics" className="block">
//               <div className="p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors group cursor-pointer">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
//                     <TrendingUp className="w-5 h-5 text-accent" />
//                   </div>
//                   <div>
//                     <p className="font-medium text-foreground">View Analytics</p>
//                     <p className="text-sm text-muted-foreground">Performance insights</p>
//                   </div>
//                 </div>
//               </div>
//             </Link>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  Send,
  CheckCircle,
  Calendar,
  LayoutDashboard,
  Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/types';
import { format } from 'date-fns';
import { NotificationBell } from "@/components/NotificationBell";

export default function Dashboard() {
  const { quotations, invoices } = useApp();

  // Calculate KPIs
  const activeQuotations = quotations.filter((q) => !q.is_template);


  const pendingPayments = invoices.filter((i) => i.invoice_status !== 'paid').length;
  // const completedProjects = activeQuotations.filter((q) => invoices.some((i) => i.quotation_id === q.id && i.invoice_status === 'paid')).length;
  const totalQuotations = quotations.filter(q => !q.is_template).length;
  const invoicedProjects = activeQuotations.filter(
    q => q.status === 'invoiced'
  ).length;
  const sentQuotations = quotations.filter(q => q.status === 'sent' || q.status === 'accepted' || q.status === 'declined').length;
  const acceptedQuotations = quotations.filter(q => q.status === 'accepted').length;
  const ongoingProjects = acceptedQuotations;
  const declinedQuotations = quotations.filter(
    q => q.status === "declined"
  ).length;
  const conversionRate = sentQuotations > 0 ? Math.round((acceptedQuotations / sentQuotations) * 100) : 0;

  const stats = [
    {
      label: 'Ongoing Projects',
      value: ongoingProjects,
      icon: Calendar,
      color: 'text-foreground',
    },
    {
      label: 'Unpaid Invoices',
      value: pendingPayments,
      icon: Receipt,
      color: 'text-amber-600',
    },

    {
      label: 'Total Quotations',
      value: totalQuotations,
      icon: FileText,
      color: 'text-primary'
    },
    {
      label: 'Invoiced Projects',
      value: invoicedProjects,
      icon: Receipt,
      color: 'text-green-500',
    },
    {
      label: 'Sent Quotations',
      value: sentQuotations,
      icon: Send,
      color: 'text-blue-500'
    },
    {
      label: 'Accepted Quotations',
      value: acceptedQuotations,
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      label: 'Declined Quotations',
      value: declinedQuotations,
      icon: FileText,
      color: 'text-destructive'
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'text-accent'
    },

  ];

  const recentQuotations = quotations
    .filter(q => !q.is_template)
    .slice(0, 5);

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-primary/10 text-primary',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-destructive/10 text-destructive',
    expired: 'bg-muted text-muted-foreground',
  };

  const recentInvoices = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 3);


  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-md shadow-black/10 ring-1 ring-black/5">
            <LayoutDashboard className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your quotation overview.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <NotificationBell />
          <Link to="/quotations/new">
            <Button className="font-heading gap-2 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Plus className="w-4 h-4" />
              Create Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="glass-card card-hover group relative overflow-hidden border border-border/60 hover:border-black/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-black/5 group-hover:bg-black transition-colors duration-300" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-secondary group-hover:bg-black/5 transition-colors">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-heading font-bold text-foreground tabular-nums">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotations */}
        <Card className="lg:col-span-2 glass-card border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
            <CardTitle className="font-heading text-lg">Recent Quotations</CardTitle>
            <Link to="/quotations">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:bg-black hover:text-white focus-visible:text-white cursor-pointer rounded-lg transition-colors">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-5">
            {recentQuotations.length > 0 ? (
              <div className="space-y-3">
                {recentQuotations.map((quote) => (
                  <Link
                    key={quote.id}
                    to={`/quotations/${quote.id}/preview`}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-black/10 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {quote.client?.name || quote.client?.business_name || 'No client'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {quote.title || `Quote #${quote.quotation_number}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="font-heading font-semibold text-foreground">
                          {formatCurrency(quote.total, quote.currency)}
                        </p>
                        {quote.valid_until && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Valid: {format(new Date(quote.valid_until), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Badge className={`${statusColors[quote.status]} rounded-full px-3 py-1 font-medium`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No quotations yet</p>
                <Link to="/quotations/new">
                  <Button variant="outline" className="gap-2 rounded-xl hover:bg-black hover:text-white transition-colors">
                    <Plus className="w-4 h-4" /> Create your first quotation
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="glass-card border border-border/60">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="font-heading text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {/* <Link to="/quotations/new" className="block">
              <div className="p-4 rounded-xl bg-black hover:bg-black/90 transition-colors group cursor-pointer shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">New Quotation</p>
                    <p className="text-sm text-white/70">Create a new quote</p>
                  </div>
                </div>
              </div>
            </Link> */}
              <Link to="/clients" className="block">
                <div className="p-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-transparent hover:border-black/10 transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Add Client</p>
                      <p className="text-sm text-muted-foreground">Register new client</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link to="/analytics" className="block">
                <div className="p-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-transparent hover:border-black/10 transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <TrendingUp className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">View Analytics</p>
                      <p className="text-sm text-muted-foreground">Performance insights</p>
                    </div>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card border border-border/60">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="font-heading text-lg">
                Recent Invoices
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    className="block"
                  >
                    <div className="rounded-xl border border-border/60 p-3 hover:border-black/20 transition-all">

                      <div className="flex justify-between items-center">

                        <div>
                          <p className="font-semibold">
                            {invoice.invoice_number}
                          </p>

                          <p className="text-sm text-muted-foreground truncate">
                            {invoice.client?.business_name ||
                              invoice.client?.name}
                          </p>
                        </div>

                        <Badge>
                          {invoice.invoice_status}
                        </Badge>

                      </div>

                      <p className="mt-2 font-heading font-semibold">
                        {formatCurrency(
                          invoice.total,
                          invoice.currency
                        )}
                      </p>

                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}