const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/Reports/MyLedger.js',
  'frontend/src/pages/Transactions/CustomerLedger.js',
  'frontend/src/pages/Transactions/SupplierLedger.js',
  'frontend/src/pages/Transactions/Inventory.js',
  'frontend/src/pages/Transactions/Receipts.js'
];

const orbxFooter = `
          {/* OrbX Footer */}
          <Box sx={{
            position: 'absolute',
            bottom: '10mm',
            left: '15mm',
            '@media print': {
              position: 'fixed',
              bottom: '10mm',
              left: '15mm',
            }
          }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 500 }}>
              Powered by OrbX | orbx.in
            </Typography>
          </Box>
`;

for (const file of files) {
  const filePath = path.join(__dirname, '../../', file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/\r\n/g, '\n');

  if (!content.includes("position: 'relative',") && content.includes("ref={printRef}")) {
    content = content.replace(
      /(<Box\s+ref=\{printRef\}\s+sx=\{\{\s+)/,
      "$1position: 'relative',\n              "
    );
  }

  if (file.includes("Ledger.js")) {
    content = content.replace(
      "        </Box>\n      </div>\n    </Box>",
      orbxFooter + "        </Box>\n      </div>\n    </Box>"
    );
  } else if (file.includes("Inventory.js") || file.includes("Receipts.js")) {
    content = content.replace(
      "        </Box>\n      </CommonModal>\n    </Box>",
      orbxFooter + "        </Box>\n      </CommonModal>\n    </Box>"
    );
    // In case Inventory has </Box>\n</Box>\n</CommonModal>
    content = content.replace(
      "        </Box>\n        </Box>\n      </CommonModal>",
      orbxFooter + "        </Box>\n        </Box>\n      </CommonModal>"
    );
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
}
console.log("Done updating footers");
