export default function Footer() {
  const copyrightDate = new Date().getFullYear();
  const copyrightLink = "mailto:simon.felix.conrad@proton.me";
  const copyrightName = "Simon Felix Conrad";

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <footer className="z-10 mt-auto flex w-full flex-col items-center gap-y-2 rounded-lg bg-white p-4 shadow md:flex-row md:justify-between md:p-6 dark:bg-slate-800 dark:text-slate-400">
      <span className="order-last text-sm text-gray-500 md:order-first lg:flex-1 dark:text-gray-400">
        © {copyrightDate}{" "}
        <a
          href={copyrightLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {copyrightName}
        </a>
      </span>
      <div className="hidden text-center lg:inline lg:flex-1">
        <button
          type="button"
          onClick={scrollToTop}
          className="cursor-pointer text-center text-sm text-gray-500 hover:underline dark:text-slate-400"
        >
          Scroll to Top
        </button>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 text-sm text-gray-500 md:gap-x-6 lg:flex-1 lg:justify-end dark:text-gray-400">
        <li>
          <a href="#" className="cursor-pointer hover:underline">
            Privacy Policy
          </a>
        </li>
        <li>
          <a href="#" className="cursor-pointer hover:underline">
            Licensing
          </a>
        </li>
        <li>
          <a href="#" className="cursor-pointer hover:underline">
            Imprint
          </a>
        </li>
      </ul>
    </footer>
  );
}
