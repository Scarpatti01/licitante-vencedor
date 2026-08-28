-- O balde onde o livro mora, e de onde ele sai carimbado.
--
-- Privado, e sem política nenhuma de leitura. Isso é deliberado: nenhum
-- usuário final lê deste balde por conta própria. Quem lê é o servidor, com a
-- credencial de serviço, depois de conferir na `compras_da_jornada` que aquele
-- e-mail pagou. O que chega ao navegador é sempre uma URL assinada de curta
-- duração, gerada por nós.
--
-- Sem política, RLS nega tudo por omissão, que é exatamente o que se quer: um
-- balde de produto pago não deve ter caminho de leitura que não passe pela
-- conferência de compra.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'livro',
  'livro',
  false,
  52428800,
  array['application/pdf', 'application/epub+zip']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
