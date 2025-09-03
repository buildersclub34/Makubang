/**
 * Loads an external script dynamically
 * @param src The URL of the script to load
 * @param id Optional ID to prevent duplicate loading
 * @returns Promise that resolves when the script is loaded
 */
export const loadScript = (src: string, id?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If script is already loaded, resolve immediately
    if (id && document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    if (id) {
      script.id = id;
    }

    script.onload = () => {
      console.log(`Script loaded: ${src}`);
      resolve();
    };

    script.onerror = (error) => {
      console.error(`Error loading script: ${src}`, error);
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });
};

/**
 * Loads the Razorpay script
 * @returns Promise that resolves when Razorpay is available
 */
export const loadRazorpay = (): Promise<void> => {
  return loadScript(
    'https://checkout.razorpay.com/v1/checkout.js',
    'razorpay-checkout-script'
  );
};
