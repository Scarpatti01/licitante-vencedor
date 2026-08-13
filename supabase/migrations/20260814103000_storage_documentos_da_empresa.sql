-- Bucket privado dos documentos da empresa e as policies de Storage.
--
-- Fica em migração separada e por último porque é a única que depende de
-- objetos fora de `public` (`storage.buckets`, `storage.objects`). Se o papel
-- que aplica as migrações não tiver permissão de criar policy em
-- `storage.objects`, é ESTE arquivo que falha, e nenhum outro — ver README.
--
-- A convenção de caminho é `<empresa_id>/<documento_id>`, e ela é a regra de
-- segurança, não organização de pastas: a policy compara a primeira pasta com
-- as empresas do usuário. Gravar em caminho fora dessa forma é negado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-da-empresa',
  'documentos-da-empresa',
  -- Privado. Certidão, balanço e contrato social de cliente não têm URL
  -- pública, nem "difícil de adivinhar": o acesso passa por URL assinada.
  false,
  52428800, -- 50 MiB: acima disso é digitalização mal feita, não documento
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Comparação por texto, sem converter a pasta para uuid: caminho malformado
-- (enviado de propósito) faria o cast levantar exceção dentro da policy, e
-- exceção em policy é erro 500 no lugar de um "negado" limpo.
create policy "membros leem documentos da sua empresa"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos-da-empresa'
    and exists (
      select 1
        from public.empresas_do_usuario() as empresa
       where empresa::text = split_part(storage.objects.name, '/', 1)
    )
  );

create policy "membros enviam documentos da sua empresa"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos-da-empresa'
    and exists (
      select 1
        from public.empresas_do_usuario() as empresa
       where empresa::text = split_part(storage.objects.name, '/', 1)
    )
  );

create policy "membros substituem documentos da sua empresa"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documentos-da-empresa'
    and exists (
      select 1
        from public.empresas_do_usuario() as empresa
       where empresa::text = split_part(storage.objects.name, '/', 1)
    )
  )
  with check (
    bucket_id = 'documentos-da-empresa'
    and exists (
      select 1
        from public.empresas_do_usuario() as empresa
       where empresa::text = split_part(storage.objects.name, '/', 1)
    )
  );

-- Apagar arquivo é de dono/administrador, igual ao DELETE da linha em
-- `documentos_da_empresa` — as duas permissões têm de andar juntas, senão o
-- operador apaga o PDF e deixa o cadastro apontando para o vazio.
create policy "administracao apaga documentos da sua empresa"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documentos-da-empresa'
    and exists (
      select 1
        from public.membros_da_empresa m
       where m.usuario_id = (select auth.uid())
         and m.removido_em is null
         and m.papel in ('dono', 'administrador')
         and m.empresa_id::text = split_part(storage.objects.name, '/', 1)
    )
  );
