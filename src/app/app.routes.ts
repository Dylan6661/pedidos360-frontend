import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage), title: 'Pedidos360' },
  {
    path: 'catalogo',
    canActivate: [MsalGuard],
    loadComponent: () => import('./pages/catalogo/catalogo.page').then((m) => m.CatalogoPage),
    title: 'Catálogo · Pedidos360',
  },
  {
    path: 'pedidos',
    canActivate: [MsalGuard],
    loadComponent: () => import('./pages/pedidos/pedidos.page').then((m) => m.PedidosPage),
    title: 'Pedidos · Pedidos360',
  },
  {
    path: 'pedidos/:id',
    canActivate: [MsalGuard],
    loadComponent: () => import('./pages/pedido-detalle/pedido-detalle.page').then((m) => m.PedidoDetallePage),
    title: 'Detalle de pedido · Pedidos360',
  },
  {
    path: 'perfil',
    canActivate: [MsalGuard],
    loadComponent: () => import('./pages/perfil/perfil.page').then((m) => m.PerfilPage),
    title: 'Mi perfil · Pedidos360',
  },
  {
    path: 'admin/productos',
    canActivate: [MsalGuard, adminGuard],
    loadComponent: () => import('./pages/admin-productos/admin-productos.page').then((m) => m.AdminProductosPage),
    title: 'Administrar productos · Pedidos360',
  },
  {
    path: 'admin/clientes',
    canActivate: [MsalGuard, adminGuard],
    loadComponent: () => import('./pages/admin-clientes/admin-clientes.page').then((m) => m.AdminClientesPage),
    title: 'Clientes · Pedidos360',
  },
  {
    path: 'no-autorizado',
    loadComponent: () => import('./pages/no-autorizado/no-autorizado.page').then((m) => m.NoAutorizadoPage),
    title: 'Acceso denegado · Pedidos360',
  },
  { path: '**', redirectTo: '' },
];
