# Ativação online — versão 0.22

## 1. Criar o servidor

1. Criar um projeto em `https://supabase.com/dashboard`.
2. Abrir **SQL Editor**.
3. Executar todo o conteúdo de `supabase/schema.sql` uma única vez.
4. Em **Authentication > Providers > Email**, manter o acesso por e-mail ativo.

## 2. Ligar a aplicação

Em **Project Settings > API**, copiar:

- `Project URL`;
- chave pública `anon`/`publishable`.

Preencher `app/src/main/assets/online-config.js`:

```javascript
window.IMPERIO_ONLINE_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  anonKey: 'SUA-CHAVE-PUBLICA'
};
```

Nunca colocar a chave `service_role` dentro da aplicação.

## 3. Teste multijogador

1. Instalar o APK em dois dispositivos.
2. Criar uma conta diferente em cada dispositivo.
3. Confirmar o e-mail, caso essa opção esteja ativa no Supabase.
4. Entrar nas duas contas e abrir **Mapa do Reino**.
5. Confirmar que aparecem os dois castelos e que cada um identifica o próprio castelo.

## Limite desta primeira versão

A v0.22 estabelece contas, persistência e mapa partilhado. O combate competitivo ainda não deve ser ativado: construção, treino, recolha e batalha serão transferidos gradualmente para funções autoritativas do servidor nas versões seguintes.
