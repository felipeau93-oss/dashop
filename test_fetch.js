const url = "https://lysyyfuylxoiilusjnot.supabase.co/storage/v1/object/public/dados_json/mapeamento_filiais.json";

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log(`JSON length: ${data.length}`);
  });
