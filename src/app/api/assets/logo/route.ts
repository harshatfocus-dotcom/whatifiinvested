import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  
  if (!symbol) {
    return new NextResponse("Missing symbol", { status: 400 });
  }

  try {
    // Financial Modeling Prep image
    const res = await fetch(`https://financialmodelingprep.com/image-stock/${symbol}.png`, {
      method: "GET",
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      next: { revalidate: 604800 } // Cache statically on edge for a week
    });

    if (!res.ok) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const contentType = res.headers.get("Content-Type") || "image/png";
    
    // Check if the body is surprisingly small (often implies a 1x1 invisible pixel fallback)
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 500) {
      return new NextResponse("Not Found / Blank Pixel", { status: 404 });
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });

  } catch (error) {
    console.error(`Logo proxy error for ${symbol}:`, error);
    return new NextResponse("Server Error", { status: 500 });
  }
}
