import Image from "next/image";
import { Link } from "@/app/i18n/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full">
      {/* Background image full page */}
      <Image
        src="/assets/images/auth-bg.jpg.jpeg"
        alt="Background"
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/65" />

      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative flex-col items-center justify-center">
        <div className="relative z-10 flex flex-col items-center px-12">
          <Link href="/">
            <Image
              src="/assets/images/logo_kodex.png"
              alt="Kodex"
              width={200}
              height={66}
            />
          </Link>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 lg:px-12 relative z-10">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="/">
            <Image
              src="/assets/images/logo_kodex.png"
              alt="Kodex"
              width={140}
              height={46}
            />
          </Link>
        </div>

        {/* Form */}
        <div className="w-full max-w-md sm:max-w-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
