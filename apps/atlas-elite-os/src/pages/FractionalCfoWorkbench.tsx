/**
 * /financials — Atlas is not the CFO / financial-intelligence system of record.
 * Growth Command Center owns commercial CFO books. Do not impersonate GCC or fabricate QBO/Plaid.
 */
import { DeferredBoundaryPage } from './PlaceholderModule';

export function FractionalCfoWorkbench() {
  return (
    <DeferredBoundaryPage
      title="Financial Performance"
      description="This route is deferred. Atlas does not host client books, cash forecasts, AR/AP boards, or live QBO/Plaid. Development fixtures were removed so this page cannot be mistaken for Growth Command Center."
      notAtlasSor="Growth Command Center — commercial CFO / financial intelligence. QuickBooks and Plaid are not Atlas connectors on this route."
      atlasFallback="Atlas V1 SoR is SharePoint HVCG_* for HVCG operating records. Client financial work does not run in this shell."
    />
  );
}
