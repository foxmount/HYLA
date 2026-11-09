# HYLA — Cidade em Foco

Projeto acadêmico da FATEC Itu para gestão urbana comunitária. O HYLA permite visualizar relatos de problemas urbanos e acompanhar ocorrências por categoria e status.

## Tecnologias

- HTML5, CSS3 e JavaScript Vanilla
- Tailwind CSS via CDN
- Leaflet e tiles do OpenStreetMap
- SweetAlert2 e Lucide Icons

## Executar localmente

Abra `index.html` com a extensão Live Server no VS Code. Para iniciar o servidor pela linha de comando na pasta do projeto:

```powershell
python -m http.server 5500
```

Depois, acesse <http://127.0.0.1:5500>.

## Estado atual

O frontend está em fase de protótipo. Login, cadastro e ocorrências usam dados demonstrativos; a integração com Supabase ainda não foi configurada. As localizações mostradas no mapa também são aproximadas e ilustrativas.

## Mapa

O mapa usa Leaflet e tiles do OpenStreetMap sem chave de API. É necessária conexão com a internet para carregar o mapa. Mantenha os créditos exibidos e respeite a [política de uso dos tiles do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
