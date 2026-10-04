import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDirectory = path.resolve(__dirname, "../public");
const productDirectory = path.join(publicDirectory, "products");

const illustrations: Record<string, string> = {
  laptopstand: `<path d="m66 112 91-45 22 14-91 45Z" fill="#91a499"/><path d="m88 126 91-45v12l-91 45Z" fill="#617e70"/><path d="m100 131 45-23 22 49-16 8-20-40-21 12Z" fill="#aebeb2"/><path d="m103 164 56-4 24 12-81 7-30-13 17-6Z" fill="#7b9485"/><path d="m64 80 91-30 20 31-88 44Z" fill="#bccabd" stroke="#7f9788" stroke-width="2"/><path d="m72 84 79-27 16 23-77 36Z" fill="#dce5d9"/><path d="m85 115 3 12m-14-6 13 7" stroke="#59776a" stroke-width="3" stroke-linecap="round"/>`,
  headphones: `<path d="M69 108V92c0-62 102-62 102 0v16" fill="none" stroke="#58756c" stroke-width="18"/><path d="M69 102V91c0-49 102-49 102 0v11" fill="none" stroke="#9daf9f" stroke-width="7"/><path d="M60 99c-7 0-12 7-12 17v18c0 13 5 20 13 20h17V99Z" fill="#57756a"/><path d="M180 99c7 0 12 7 12 17v18c0 13-5 20-13 20h-17V99Z" fill="#456256"/><rect x="70" y="96" width="22" height="64" rx="11" fill="#b2c0af"/><rect x="148" y="96" width="22" height="64" rx="11" fill="#9eb099"/><path d="M83 110v36m73-36v36" stroke="#d8e1ce" stroke-width="3" stroke-linecap="round"/>`,
  mug: `<path d="M153 84h18c29 0 29 49 0 49h-15" fill="none" stroke="#b36e51" stroke-width="12"/><path d="M74 78h86v62c0 30-86 30-86 0Z" fill="#d39370"/><ellipse cx="117" cy="78" rx="43" ry="12" fill="#efd3b7"/><ellipse cx="117" cy="79" rx="34" ry="7" fill="#8d6750"/><path d="M86 96v34c0 10 8 16 17 18" fill="none" stroke="#e7b18c" stroke-width="4" stroke-linecap="round"/><path d="M105 57c-14-14 10-17-2-32m32 35c-14-14 10-17-2-32" fill="none" stroke="#bdc6b8" stroke-width="3" stroke-linecap="round"/>`,
  bottle: `<path d="M100 54h40v17l13 14v65c0 23-66 23-66 0V85l13-14Z" fill="#709182"/><rect x="99" y="38" width="42" height="22" rx="6" fill="#44685b"/><path d="M106 48h28" stroke="#7d9b89" stroke-width="2" stroke-linecap="round"/><path d="M96 92v48" stroke="#a3bbab" stroke-width="6" stroke-linecap="round"/><rect x="92" y="108" width="56" height="34" rx="6" fill="#adc3ac"/><path d="M112 123h16" stroke="#608471" stroke-width="3" stroke-linecap="round"/>`,
  backpack: `<path d="M107 54V42c0-13 26-13 26 0v12" fill="none" stroke="#857151" stroke-width="7"/><path d="M72 93c-10 4-14 15-14 27v26h13m97-53c10 4 14 15 14 27v26h-13" fill="#ac9b75"/><path d="M71 80c0-41 98-41 98 0v71c0 18-98 18-98 0Z" fill="#b4a47d"/><path d="M75 81c1-35 89-35 90 0" fill="none" stroke="#d0c29e" stroke-width="4"/><path d="M87 75h67" stroke="#826f4d" stroke-width="3" stroke-linecap="round"/><rect x="87" y="105" width="66" height="48" rx="12" fill="#cfbf98"/><path d="M96 118h48" stroke="#927e57" stroke-width="3" stroke-linecap="round"/><path d="M146 118v8" stroke="#927e57" stroke-width="3" stroke-linecap="round"/><rect x="108" y="84" width="24" height="9" rx="2" fill="#877356"/>`,
  umbrella: `<path d="M120 37v114c0 21 27 21 27 0" fill="none" stroke="#466d5b" stroke-width="6" stroke-linecap="round"/><path d="M49 102c6-83 135-83 142 0-17-16-32-16-47 0-16-16-32-16-48 0-16-16-31-16-47 0Z" fill="#d58968" stroke="#c27858" stroke-width="2"/><path d="M120 42c-17 18-24 35-24 59m24-59c17 18 24 35 24 59" fill="none" stroke="#edb495" stroke-width="3"/><path d="M120 33v9" stroke="#466d5b" stroke-width="5" stroke-linecap="round"/>`,
  lamp: `<ellipse cx="114" cy="166" rx="40" ry="8" fill="#8e9b8d"/><path d="m108 155 19-60-24-29" fill="none" stroke="#697f6b" stroke-width="8" stroke-linecap="round"/><circle cx="127" cy="95" r="8" fill="#d1d9c7" stroke="#778a74" stroke-width="3"/><path d="m70 47 39 10 25 31-75-20Z" fill="#b6c3a9" stroke="#839674" stroke-width="2"/><ellipse cx="95" cy="77" rx="39" ry="7" transform="rotate(15 95 77)" fill="#ece6c4"/><path d="m106 154 15 0 4 11H97Z" fill="#c4ceb9"/>`,
  charger: `<path d="m70 113 64-24 51 24-64 29Z" fill="#c5d0c0" stroke="#8da18e" stroke-width="2"/><path d="m70 113 51 29 64-29v10l-64 29-51-29Z" fill="#9fb19d"/><path d="m98 98 52-23 24 12-53 26Z" fill="#476555"/><path d="m99 95 51-24 24 13-53 25Z" fill="#aabfa7" stroke="#698773" stroke-width="2"/><path d="m107 94 42-18 18 9-44 21Z" fill="#e0e9d5"/><path d="m184 122 23 9c19 8-21 13-4 24" fill="none" stroke="#829980" stroke-width="4" stroke-linecap="round"/><circle cx="94" cy="132" r="2" fill="#e3eadb"/>`,
  notebook: `<path d="m79 50 85 10v106l-87-10Z" fill="#e3d1af"/><path d="m81 44 88 10v106l-88-10Z" fill="#be8768" stroke="#a97157" stroke-width="2"/><path d="m79 46 11 1v106l-11-2Z" fill="#985f46"/><path d="m99 67 48 5" stroke="#e4b496" stroke-width="2" stroke-linecap="round"/><path d="m99 76 35 4" stroke="#e4b496" stroke-width="2" stroke-linecap="round"/><path d="m155 56 0 103-9-7-7 5V54" fill="#607d6a"/><path d="M81 155v7l88 10v-7" fill="#f1e6d2"/><path d="m177 72 6 1-7 87-6 8 0-10Z" fill="#718a6d"/><path d="m171 159 5 1-6 8Z" fill="#a37455"/>`,
  blanket: `<path d="m64 97 112-32 19 74-113 32Z" fill="#adb797" stroke="#919f7f" stroke-width="2"/><path d="m63 97 20 74 111-32-19-15-95 28Z" fill="#879a77"/><path d="m64 96 111-31 19 18-114 33Z" fill="#ced2b7"/><path d="m80 118 113-34m-102 48 91-26m-83 42 91-26" stroke="#dde0c8" stroke-width="3" opacity=".7"/><path d="m94 91 17 53m10-61 17 53m10-61 17 53" stroke="#8e9f7a" stroke-width="2" opacity=".55"/><path d="m84 168 0 8m12-12 0 9m12-13 0 9m12-13 0 10m12-13 0 9m12-13 0 9m12-13 0 9m12-13 0 9m12-13 0 9" stroke="#899a77" stroke-width="2"/>`,
  pouch: `<path d="M60 93c0-11 120-11 120 0l9 55c3 18-139 18-136 0Z" fill="#c99a79" stroke="#b18061" stroke-width="2"/><ellipse cx="120" cy="94" rx="59" ry="9" fill="#e4bf9c"/><path d="M69 94h102" stroke="#937459" stroke-width="3" stroke-linecap="round"/><path d="m164 94 8 16" stroke="#937459" stroke-width="4" stroke-linecap="round"/><path d="M78 110c-2 17-4 26-3 37" fill="none" stroke="#dfb798" stroke-width="4" stroke-linecap="round"/><rect x="108" y="114" width="28" height="18" rx="3" fill="#9d7255"/>`,
  chair: `<path d="m77 111 4 54m72-54-6 54m-39-26-12 27m41-27 16 27" fill="none" stroke="#8b775a" stroke-width="7" stroke-linecap="round"/><path d="M77 72c0-28 80-28 80 0l-6 47H82Z" fill="#92a88f" stroke="#6f896d" stroke-width="2"/><path d="M65 118c15-16 96-16 108 0l-13 19H80Z" fill="#b4c3a5" stroke="#7f9977" stroke-width="2"/><path d="M83 75c2-10 60-10 65 0" fill="none" stroke="#bccbb1" stroke-width="4" stroke-linecap="round"/><path d="m62 96 9 31m105-31-11 31" stroke="#738970" stroke-width="6" stroke-linecap="round"/>`,
};

function productSvg(name: string, shape: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="200" viewBox="0 0 240 200" role="img" aria-label="Illustration of a ${name}"><ellipse cx="122" cy="174" rx="59" ry="8" fill="#173b31" opacity=".055"/>${shape}</svg>`;
}

const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-labelledby="title description">
<title id="title">Semantic Catalog Search by Webytex</title><desc id="description">A search for keep my coffee hot connects through local AI to illustrated products. Find what you mean.</desc>
<rect width="1920" height="1080" fill="#f8f7f2"/>
<g font-family="Arial,Helvetica,sans-serif">
<g transform="translate(127 98)"><rect width="48" height="48" rx="13" fill="#173b31"/><path d="M18 12h-4v9l-4 3 4 3v9h4m12-24h4v9l4 3-4 3v9h-4" fill="none" stroke="#fffefa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="67" y="32" font-size="20" letter-spacing="2.6" fill="#65735f">BY <tspan font-weight="700">WEBYTEX</tspan></text></g>
<text x="120" y="282" font-size="112" letter-spacing="-5" font-weight="700" fill="#173b31">Find what you <tspan fill="#d36f51" font-style="italic">mean.</tspan></text>
<text x="127" y="348" font-size="33" fill="#697965">Semantic Catalog Search</text>
<g transform="rotate(-3 461 615)"><rect x="130" y="530" width="647" height="166" rx="22" fill="#fffefa" stroke="#d1dccb" stroke-width="2"/><circle cx="182" cy="614" r="16" stroke="#728c6c" stroke-width="4" fill="none"/><path d="m194 626 12 12" stroke="#728c6c" stroke-width="4" stroke-linecap="round"/><text x="235" y="625" font-size="30" fill="#3c5940">keep my coffee hot</text></g>
<path d="M816 615h75m-17-14 17 14-17 14M1060 615h75m-17-14 17 14-17 14" fill="none" stroke="#a1b592" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(928 567)"><rect width="95" height="95" rx="23" fill="#e7efdf" stroke="#ccdbc1" stroke-width="2"/><g fill="#729062"><circle cx="28" cy="28" r="5"/><circle cx="47" cy="28" r="5"/><circle cx="66" cy="28" r="5"/><circle cx="28" cy="47" r="5"/><circle cx="47" cy="47" r="5"/><circle cx="66" cy="47" r="5"/><circle cx="28" cy="66" r="5"/><circle cx="47" cy="66" r="5"/><circle cx="66" cy="66" r="5"/></g></g>
<text x="976" y="710" text-anchor="middle" font-size="15" letter-spacing="2.3" fill="#6e8660">LOCAL AI</text>
<g transform="rotate(4 1458 625)"><rect x="1210" y="432" width="462" height="348" rx="23" fill="#eee7dc" stroke="#ddd6c6" stroke-width="2"/><g transform="translate(1250 453) scale(1.55)">${illustrations.mug}</g><rect x="1239" y="710" width="404" height="41" rx="8" fill="#fffefa"/><text x="1260" y="738" fill="#5b7152" font-size="19">Found by meaning</text><circle cx="1618" cy="731" r="5" fill="#7f9a70"/></g>
<g font-size="17" letter-spacing="2.2" fill="#7c8b72"><text x="132" y="948">KEYWORDS + MEANING</text><text x="1680" y="948" text-anchor="end">A SMALL TOOL. A USEFUL POSSIBILITY.</text></g>
</g></svg>`;

async function main() {
  await mkdir(productDirectory, { recursive: true });
  await Promise.all(Object.entries(illustrations).map(([name, shape]) => writeFile(path.join(productDirectory, `${name}.svg`), productSvg(name, shape), "utf8")));
  await writeFile(path.join(publicDirectory, "article-cover.svg"), cover, "utf8");
  await sharp(Buffer.from(cover)).png({ compressionLevel: 9 }).toFile(path.join(publicDirectory, "article-cover.png"));
  console.log("Generated 12 original product illustrations and article-cover.svg/png at 1920 × 1080.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Illustration generation failed.");
  process.exitCode = 1;
});
