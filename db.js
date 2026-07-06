/**
 * db.js - Quản lý dữ liệu và lưu trữ LocalStorage cho ứng dụng quản lý chi phí.
 * Bản nâng cấp: Hỗ trợ cấu trúc Ma trận TMĐT đa giai đoạn và Tiến độ chi tiết từng gói thầu.
 */

const STORAGE_KEY = 'antigravity_pm_costs_db_v120';

// Dữ liệu Mock ban đầu cho các dự án bất động sản/xây dựng tại Việt Nam
const DEFAULT_MOCK_DATA = {
  projects: [
    {
      id: "PROJ-001",
      code: "GV",
      name: "Khu đô thị sinh thái Green Valley",
      location: "Lương Sơn, Hòa Bình",
      scale: "Quy mô 50 ha, gồm 500 lô biệt thự, liền kề & công viên cảnh quan",
      status: "in-progress", // planned, in-progress, completed
      startDate: "2025-01-15",
      endDate: "2027-12-31",
      
      // Matrix TMĐT đa giai đoạn
      tmdt: {
        gpmb: { design: 28000000000, approved: 30000000000, adjusted: 30000000000 },
        construction: { design: 105000000000, approved: 110000000000, adjusted: 112000000000 },
        equipment: { design: 18000000000, approved: 20000000000, adjusted: 20000000000 },
        qlda: { design: 4500000000, approved: 5000000000, adjusted: 5000000000 },
        consulting: { design: 7500000000, approved: 8000000000, adjusted: 8200000000 },
        other: { design: 2000000000, approved: 2000000000, adjusted: 2000000000 },
        contingency: { design: 15000000000, approved: 20000000000, adjusted: 17800000000 }
      },
      
      // Mỗi gói thầu lưu song song 2 tiến trình: bid (lựa chọn nhà thầu) & thi công (construction)
      budgets: [
        { 
          id: "bg-001", 
          code: "NS-XL-01", 
          name: "Hạng mục: San nền & Hạ tầng kỹ thuật chung", 
          category: "construction", 
          amount: 25000000000,
          bidPlanStart: "2025-02-01",
          bidPlanEnd: "2025-03-31",
          bidActualStart: "2025-02-01",
          bidActualEnd: "2025-04-10",
          bidProgress: 100,
          planStart: "2025-04-15",
          planEnd: "2025-09-30",
          actualStart: "2025-04-15",
          actualEnd: "",
          progress: 65
        },
        { 
          id: "bg-002", 
          code: "NS-XL-02", 
          name: "Hạng mục: Xây dựng móng & kết cấu 100 căn biệt thự mẫu", 
          category: "construction", 
          amount: 50000000000,
          bidPlanStart: "2025-03-15",
          bidPlanEnd: "2025-05-15",
          bidActualStart: "2025-03-15",
          bidActualEnd: "2025-05-20",
          bidProgress: 100,
          planStart: "2025-06-01",
          planEnd: "2025-12-15",
          actualStart: "2025-06-05",
          actualEnd: "",
          progress: 20
        },
        { 
          id: "bg-003", 
          code: "NS-TB-01", 
          name: "Cung cấp, lắp đặt trạm biến áp và hệ thống phân phối điện", 
          category: "equipment", 
          amount: 12000000000,
          bidPlanStart: "2025-11-01",
          bidPlanEnd: "2026-01-05",
          bidActualStart: "2025-11-05",
          bidActualEnd: "",
          bidProgress: 40,
          planStart: "2026-01-10",
          planEnd: "2026-04-30",
          actualStart: "",
          actualEnd: "",
          progress: 0
        },
        { 
          id: "bg-004", 
          code: "NS-TV-01", 
          name: "Tư vấn giám sát thi công xây dựng & lắp đặt thiết bị", 
          category: "consulting", 
          amount: 2000000000,
          bidPlanStart: "2025-02-15",
          bidPlanEnd: "2025-04-05",
          bidActualStart: "2025-02-15",
          bidActualEnd: "2025-04-12",
          bidProgress: 100,
          planStart: "2025-04-15",
          planEnd: "2027-12-31",
          actualStart: "2025-04-15",
          actualEnd: "",
          progress: 45
        },
        { 
          id: "bg-005", 
          code: "NS-QL-01", 
          name: "Chi phí hoạt động của Ban Quản lý dự án", 
          category: "qlda", 
          amount: 3500000000,
          bidPlanStart: "2025-01-15",
          bidPlanEnd: "2025-01-15",
          bidActualStart: "2025-01-15",
          bidActualEnd: "2025-01-15",
          bidProgress: 100,
          planStart: "2025-01-15",
          planEnd: "2027-12-31",
          actualStart: "2025-01-15",
          actualEnd: "",
          progress: 48
        }
      ],
      bids: [
        {
          id: "bid-001",
          budgetId: "bg-001",
          code: "ĐT-XL-01",
          name: "Gói thầu: Thi công san lấp & hạ tầng giao thông trục chính",
          estimateAmount: 24800000000,
          bidAmount: 24200000000,
          winner: "Công ty Cổ phần Xây dựng Delta Việt Nam",
          status: "awarded",
          handler: "Nguyễn Vũ Hoàng"
        },
        {
          id: "bid-002",
          budgetId: "bg-002",
          code: "ĐT-XL-02",
          name: "Gói thầu: Thi công kết cấu móng và khung thân 100 căn biệt thự phân khu A",
          estimateAmount: 49000000000,
          bidAmount: 51500000000,
          winner: "Tổng công ty Xây dựng Hòa Bình",
          status: "awarded",
          handler: "Phạm Minh Đức"
        },
        {
          id: "bid-003",
          budgetId: "bg-003",
          code: "ĐT-TB-01",
          name: "Gói thầu: Thiết bị trạm biến áp 110kV và đường dây đấu nối",
          estimateAmount: 11500000000,
          bidAmount: 0,
          winner: "",
          status: "bidding",
          handler: "Phạm Minh Đức"
        },
        {
          id: "bid-004",
          budgetId: "bg-004",
          code: "ĐT-TV-01",
          name: "Gói thầu: Tư vấn giám sát thi công hạ tầng & biệt thự",
          estimateAmount: 1900000000,
          bidAmount: 1850000000,
          winner: "Công ty Cổ phần Tư vấn Thiết kế và Đầu tư D&A",
          status: "awarded",
          handler: "Nguyễn Vũ Hoàng"
        }
      ],
      contracts: [
        {
          id: "ctr-001",
          bidId: "bid-001",
          code: "HĐ-01/2025/GV-DELTA",
          name: "Hợp đồng thi công san lấp & hạ tầng giao thông trục chính",
          partner: "Công ty Cổ phần Xây dựng Delta Việt Nam",
          value: 24200000000,
          signedDate: "2025-04-10",
          type: "fixed-unit-price",
          status: "active",
          signingEntity: "Công ty Cổ phần Đầu tư và Phát triển Green Valley",
          completionDate: "2025-09-30"
        },
        {
          id: "ctr-002",
          bidId: "bid-002",
          code: "HĐ-02/2025/GV-HB",
          name: "Hợp đồng thi công kết cấu móng và thân 100 căn biệt thự phân khu A",
          partner: "Tổng công ty Xây dựng Hòa Bình",
          value: 51500000000,
          signedDate: "2025-05-20",
          type: "adjustable-unit-price",
          status: "active",
          signingEntity: "Công ty Cổ phần Đầu tư và Phát triển Green Valley",
          completionDate: "2025-12-15"
        },
        {
          id: "ctr-003",
          bidId: "bid-004",
          code: "HĐ-03/2025/GV-DA",
          name: "Hợp đồng tư vấn giám sát xây lắp",
          partner: "Công ty Cổ phần Tư vấn Thiết kế và Đầu tư D&A",
          value: 1850000000,
          signedDate: "2025-04-15",
          type: "lump-sum",
          status: "active",
          signingEntity: "Công ty Cổ phần Đầu tư và Phát triển Green Valley",
          completionDate: "2027-12-31"
        }
      ],
      payments: [
        { 
          id: "pmt-001", 
          contractId: "ctr-001", 
          period: "Tạm ứng hợp đồng (20%)", 
          type: "advance", 
          completedAmount: 0,
          requestAmount: 4840000000, 
          deductionAdvance: 0,
          deductionMaterial: 0,
          deductionElectricity: 0,
          deductionWater: 0,
          deductionPenalty: 0,
          deductionCross: 0,
          deductionOther: 0,
          retentionAmount: 0,
          paidAmount: 4840000000, 
          paidDate: "2025-04-20", 
          status: "paid",
          receiveDate: "2025-04-12",
          completeDate: "2025-04-15",
          accountingTransferDate: "2025-04-16",
          handler: "Trần Thị Bình"
        },
        { 
          id: "pmt-002", 
          contractId: "ctr-001", 
          period: "Thanh toán đợt 1 (Đạt 30% khối lượng)", 
          type: "payment", 
          completedAmount: 8000000000,
          requestAmount: 7260000000, 
          deductionAdvance: 968000000,
          deductionMaterial: 0,
          deductionElectricity: 12000000,
          deductionWater: 5000000,
          deductionPenalty: 0,
          deductionCross: 0,
          deductionOther: 0,
          retentionAmount: 363000000,
          paidAmount: 5912000000, 
          paidDate: "2025-07-15", 
          status: "paid",
          receiveDate: "2025-07-05",
          completeDate: "2025-07-12",
          accountingTransferDate: "2025-07-13",
          handler: "Trần Thị Bình"
        },
        { 
          id: "pmt-003", 
          contractId: "ctr-001", 
          period: "Thanh toán đợt 2 (Đạt 60% khối lượng)", 
          type: "payment", 
          completedAmount: 8000000000,
          requestAmount: 7260000000, 
          deductionAdvance: 968000000,
          deductionMaterial: 0,
          deductionElectricity: 15000000,
          deductionWater: 6000000,
          deductionPenalty: 0,
          deductionCross: 0,
          deductionOther: 0,
          retentionAmount: 363000000,
          paidAmount: 0, 
          paidDate: "", 
          status: "pending",
          receiveDate: "2025-08-20",
          completeDate: "",
          accountingTransferDate: "",
          handler: "Trần Thị Bình"
        },
        { 
          id: "pmt-004", 
          contractId: "ctr-002", 
          period: "Tạm ứng hợp đồng (15%)", 
          type: "advance", 
          completedAmount: 0,
          requestAmount: 7725000000, 
          deductionAdvance: 0,
          deductionMaterial: 0,
          deductionElectricity: 0,
          deductionWater: 0,
          deductionPenalty: 0,
          deductionCross: 0,
          deductionOther: 0,
          retentionAmount: 0,
          paidAmount: 7725000000, 
          paidDate: "2025-06-05", 
          status: "paid",
          receiveDate: "2025-05-25",
          completeDate: "2025-06-03",
          accountingTransferDate: "2025-06-04",
          handler: "Lê Văn Cường"
        }
      ],
      variations: [
        {
          id: "var-001",
          contractId: "ctr-001",
          code: "HĐ-01/2025/GV-DELTA",
          name: "Xử lý nền đất yếu phát sinh đoạn Km1+200 - Km1+500",
          requestAmount: 350000000,
          approvedAmount: 320000000,
          status: "approved",
          addendumId: "add-001",
          receiveDate: "2025-06-01",
          completeDate: "2025-06-05",
          handler: "Nguyễn Vũ Hoàng"
        },
        {
          id: "var-002",
          contractId: "ctr-001",
          code: "HĐ-01/2025/GV-DELTA",
          name: "Đổi biện pháp thi công sang đóng cừ larsen gia cố thành hố móng",
          requestAmount: 180000000,
          approvedAmount: 180000000,
          status: "approved",
          addendumId: "add-001",
          receiveDate: "2025-06-10",
          completeDate: "2025-06-14",
          handler: "Lê Văn Cường"
        },
        {
          id: "var-003",
          contractId: "ctr-001",
          code: "HĐ-01/2025/GV-DELTA",
          name: "Phát sinh di dời đường ống cấp nước D200 cũ vướng mặt bằng",
          requestAmount: 50000000,
          approvedAmount: 45000000,
          status: "approved",
          addendumId: null,
          receiveDate: "2025-06-15",
          completeDate: "2025-06-18",
          handler: "Nguyễn Vũ Hoàng"
        },
        {
          id: "var-004",
          contractId: "ctr-002",
          code: "HĐ-02/2025/GV-HB",
          name: "Thay đổi chủng loại gạch ốp lát sàn phòng khách biệt thự mẫu",
          requestAmount: 120000000,
          approvedAmount: 0,
          status: "pending",
          addendumId: null,
          receiveDate: "2025-08-20",
          completeDate: "",
          handler: "Nguyễn Vũ Hoàng"
        }
      ],
      addendums: [
        {
          id: "add-001",
          contractId: "ctr-001",
          code: "PLHĐ-01/HĐ-DELTA",
          name: "Phụ lục 01: Bổ sung xử lý đất yếu và biện pháp thi công cừ larsen",
          value: 500000000,
          signedDate: "2025-06-15",
          status: "active",
          variationIds: ["var-001", "var-002"]
        }
      ],
      
      // WBS: 3 Milestone cố định ban đầu A, B, C
      milestones: [
        { id: "ms-A", name: "A. Tiến độ đền bù GPMB", planStart: "2025-01-15", planEnd: "2025-04-30", actualStart: "2025-01-20", actualEnd: "", progress: 85, status: "in-progress" },
        { id: "ms-B", name: "B. Lập báo cáo nghiên cứu khả thi/TMĐT/HQDA", planStart: "2025-02-01", planEnd: "2025-05-15", actualStart: "2025-02-01", actualEnd: "2025-05-10", progress: 100, status: "completed" },
        { id: "ms-C", name: "C. Thiết kế kỹ thuật, thiết kế bản vẽ thi công", planStart: "2025-05-01", planEnd: "2025-08-31", actualStart: "2025-05-10", actualEnd: "", progress: 30, status: "in-progress" }
      ],
      risks: [
        { id: "rsk-001", description: "Giá cát san lấp tăng mạnh tại khu vực Hòa Bình do thắt chặt nguồn cung khai thác", impact: "high", probability: "high", mitigation: "Thỏa thuận đơn giá cố định dài hạn với các mỏ cát lớn lân cận", contingencyCost: 4000000000, status: "active" },
        { id: "rsk-002", description: "Chậm tiến độ GPMB khu vực phía Nam dự án (1.2 ha chưa đồng thuận phương án)", impact: "medium", probability: "high", mitigation: "Thành lập ban cưỡng chế phối hợp cùng UBND huyện đối thoại trực tiếp", contingencyCost: 1500000000, status: "active" },
        { id: "rsk-003", description: "Thời tiết mùa mưa kéo dài làm ảnh hưởng tiến độ đổ bê tông móng biệt thự", impact: "medium", probability: "medium", mitigation: "Che chắn phủ bạt hố móng, chuẩn bị máy bơm công suất lớn thoát nước nhanh", contingencyCost: 500000000, status: "monitoring" }
      ]
    },
    {
      id: "PROJ-002",
      code: "GP",
      name: "Tòa nhà cao tầng Grand Plaza",
      location: "Đại lộ Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh",
      scale: "2 Block căn hộ cao cấp 30 tầng, 3 tầng hầm, tổng diện tích sàn 85.000 m2",
      status: "planned",
      startDate: "2026-09-01",
      endDate: "2029-03-31",
      
      tmdt: {
        gpmb: { design: 120000000000, approved: 120000000000, adjusted: 120000000000 },
        construction: { design: 500000000000, approved: 520000000000, adjusted: 520000000000 },
        equipment: { design: 100000000000, approved: 110000000000, adjusted: 110000000000 },
        qlda: { design: 15000000000, approved: 15000000000, adjusted: 15000000000 },
        consulting: { design: 25000000000, approved: 25000000000, adjusted: 25000000000 },
        other: { design: 10000000000, approved: 10000000000, adjusted: 10000000000 },
        contingency: { design: 50000000000, approved: 50000000000, adjusted: 50000000000 }
      },
      
      budgets: [
        { 
          id: "bg-101", 
          code: "NS-GP-XL-01", 
          name: "Hạng mục: Tường vây, cọc khoan nhồi và đài móng", 
          category: "construction", 
          amount: 65000000000,
          bidPlanStart: "2026-06-01",
          bidPlanEnd: "2026-08-31",
          bidActualStart: "2026-06-01",
          bidActualEnd: "",
          bidProgress: 50,
          planStart: "2026-09-01",
          planEnd: "2027-02-28",
          actualStart: "",
          actualEnd: "",
          progress: 0
        },
        { 
          id: "bg-102", 
          code: "NS-GP-XL-02", 
          name: "Hạng mục: Thi công phần hầm và thân kết cấu bê tông cốt thép", 
          category: "construction", 
          amount: 320000000000,
          bidPlanStart: "2026-11-01",
          bidPlanEnd: "2027-02-20",
          bidActualStart: "",
          bidActualEnd: "",
          bidProgress: 0,
          planStart: "2027-03-01",
          planEnd: "2028-09-30",
          actualStart: "",
          actualEnd: "",
          progress: 0
        },
        { 
          id: "bg-103", 
          code: "NS-GP-XL-03", 
          name: "Hạng mục: Hoàn thiện kiến trúc & M&E cơ bản", 
          category: "construction", 
          amount: 135000000000,
          bidPlanStart: "2028-01-01",
          bidPlanEnd: "2028-05-15",
          bidActualStart: "",
          bidActualEnd: "",
          bidProgress: 0,
          planStart: "2028-06-01",
          planEnd: "2029-03-31",
          actualStart: "",
          actualEnd: "",
          progress: 0
        },
        { 
          id: "bg-104", 
          code: "NS-GP-TB-01", 
          name: "Cung cấp & lắp đặt hệ thống 08 thang máy Schindler cao tốc", 
          category: "equipment", 
          amount: 45000000000,
          bidPlanStart: "2028-03-01",
          bidPlanEnd: "2028-07-20",
          bidActualStart: "",
          bidActualEnd: "",
          bidProgress: 0,
          planStart: "2028-08-01",
          planEnd: "2029-01-15",
          actualStart: "",
          actualEnd: "",
          progress: 0
        },
        { 
          id: "bg-105", 
          code: "NS-GP-TV-01", 
          name: "Tư vấn thiết kế kỹ thuật thi công & dự toán", 
          category: "consulting", 
          amount: 5000000000,
          bidPlanStart: "2026-04-01",
          bidPlanEnd: "2026-05-08",
          bidActualStart: "2026-04-01",
          bidActualEnd: "2026-05-10",
          bidProgress: 100,
          planStart: "2026-05-10",
          planEnd: "2026-09-30",
          actualStart: "2026-05-10",
          actualEnd: "",
          progress: 60
        }
      ],
      bids: [
        {
          id: "bid-101",
          budgetId: "bg-101",
          code: "ĐT-GP-XL-01",
          name: "Gói thầu: Thi công cọc khoan nhồi d1200-d1500 & Tường vây hầm",
          estimateAmount: 64500000000,
          bidAmount: 0,
          winner: "",
          status: "bidding",
          handler: "Nguyễn Vũ Hoàng"
        },
        {
          id: "bid-102",
          budgetId: "bg-105",
          code: "ĐT-GP-TV-01",
          name: "Gói thầu: Tư vấn khảo sát địa chất và Thiết kế bản vẽ thi công",
          estimateAmount: 4950000000,
          bidAmount: 4800000000,
          winner: "Công ty Cổ phần Tư vấn Xây dựng Tổng hợp (NAGECCO)",
          status: "awarded",
          handler: "Nguyễn Vũ Hoàng"
        }
      ],
      contracts: [
        {
          id: "ctr-101",
          bidId: "bid-102",
          code: "HĐ-01/2026/GP-NAGECCO",
          name: "Hợp đồng tư vấn khảo sát thiết kế bản vẽ thi công Grand Plaza",
          partner: "Công ty Cổ phần Tư vấn Xây dựng Tổng hợp (NAGECCO)",
          value: 4800000000,
          signedDate: "2026-05-10",
          type: "lump-sum",
          status: "active",
          signingEntity: "Công ty Cổ phần Đầu tư Xây dựng Grand Plaza",
          completionDate: "2026-09-30"
        }
      ],
      payments: [
        { 
          id: "pmt-101", 
          contractId: "ctr-101", 
          period: "Tạm ứng lần 1 (10%)", 
          type: "advance", 
          completedAmount: 0,
          requestAmount: 480000000, 
          deductionAdvance: 0,
          deductionMaterial: 0,
          deductionElectricity: 0,
          deductionWater: 0,
          deductionPenalty: 0,
          deductionCross: 0,
          deductionOther: 0,
          retentionAmount: 0,
          paidAmount: 480000000, 
          paidDate: "2026-05-25", 
          status: "paid",
          receiveDate: "2026-05-15",
          completeDate: "2026-05-20",
          accountingTransferDate: "2026-05-22",
          handler: "Phạm Văn Dũng"
        }
      ],
      variations: [],
      addendums: [],
      milestones: [
        { id: "ms-A", name: "A. Tiến độ đền bù GPMB", planStart: "2026-09-01", planEnd: "2026-12-31", actualStart: "", actualEnd: "", progress: 0, status: "pending" },
        { id: "ms-B", name: "B. Lập báo cáo nghiên cứu khả thi/TMĐT/HQDA", planStart: "2026-05-01", planEnd: "2026-08-31", actualStart: "2026-05-10", actualEnd: "", progress: 50, status: "in-progress" },
        { id: "ms-C", name: "C. Thiết kế kỹ thuật, thiết kế bản vẽ thi công", planStart: "2026-08-01", planEnd: "2026-11-30", actualStart: "", actualEnd: "", progress: 0, status: "pending" }
      ],
      risks: [
        { id: "rsk-101", description: "Rủi ro biến động tỷ giá do nhập khẩu hệ thống điều hòa Chiller trung tâm", impact: "medium", probability: "medium", mitigation: "Mua bảo hiểm tỷ giá hoặc mở bảo lãnh L/C cố định đơn giá ngoại tệ", contingencyCost: 2000000000, status: "monitoring" }
      ]
    }
  ],
  officers: [
    { id: "off-001", name: "Nguyễn Vũ Hoàng", position: "Trưởng Ban QLDA" },
    { id: "off-002", name: "Phạm Minh Đức", position: "Cán bộ Đấu thầu" },
    { id: "off-003", name: "Trần Thị Bình", position: "Kế toán dự án" },
    { id: "off-004", name: "Lê Văn Cường", position: "Cán bộ giám sát" },
    { id: "off-005", name: "Phạm Văn Dũng", position: "Cán bộ Kỹ thuật" }
  ]
};

// Khởi tạo Database
class ProjectCostsDB {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      this.reset();
    }
    // Chuẩn hóa dữ liệu (chạy cả với dữ liệu mới khởi tạo lẫn dữ liệu cũ)
    {
      try {
        const data = this.getData();
        let changed = false;
        

        // Chuẩn hóa ID các dự án về định dạng PROJ-XXX
        let nextProjId = 1;
        // Lấy danh sách ID đã chuẩn hóa (nhỏ hơn 1000) để tìm nextProjId
        data.projects.forEach(p => {
          const m = p.id.match(/^PROJ-(\d{3,4})$/);
          if (m) {
            nextProjId = Math.max(nextProjId, parseInt(m[1], 10) + 1);
          }
        });
        // Sửa các ID sai định dạng hoặc có số đuôi quá lớn (timestamp)
        data.projects.forEach(p => {
          const isValid = /^PROJ-\d{3,4}$/.test(p.id);
          if (!isValid) {
            p.id = 'PROJ-' + String(nextProjId).padStart(3, '0');
            nextProjId++;
            changed = true;
          }
        });

        // Bổ sung cán bộ nếu chưa có
        if (!data.officers) {
          data.officers = DEFAULT_MOCK_DATA.officers;
          changed = true;
        }
        
        // Bổ sung và chuẩn hóa cấu trúc dữ liệu các mảng con của dự án
        data.projects.forEach(p => {
          if (!p.code) {
            p.code = p.id === 'proj-001' ? 'GV' : (p.id === 'proj-002' ? 'GP' : 'DA-' + p.id.split('-')[1]);
            changed = true;
          }
          if (!p.materials) {
            p.materials = [];
            changed = true;
          }
          if (!p.supportDeductions) {
            p.supportDeductions = [];
            changed = true;
          }
          if (!p.penaltyDeductions) {
            p.penaltyDeductions = [];
            changed = true;
          }
          if (!p.variations) {
            p.variations = [];
            changed = true;
          }
          if (!p.addendums) {
            p.addendums = [];
            changed = true;
          }
          if (!p.contracts) {
            p.contracts = [];
            changed = true;
          }
          if (!p.payments) {
            p.payments = [];
            changed = true;
          }
          if (!p.bids) {
            p.bids = [];
            changed = true;
          }
          if (!p.budgets) {
            p.budgets = [];
            changed = true;
          }
          if (!p.risks) {
            p.risks = [];
            changed = true;
          }
          
          p.variations.forEach(v => {
            if (v.receiveDate === undefined) {
              v.receiveDate = '';
              changed = true;
            }
            if (v.completeDate === undefined) {
              v.completeDate = '';
              changed = true;
            }
            if (v.handler === undefined) {
              v.handler = '';
              changed = true;
            }
          });
        });
        
        if (changed) {
          this.saveData(data);
        }
        
        data.projects.forEach(p => {
          this.syncProjectTmdt(p.id);
        });
      } catch (e) {
        console.error("Lỗi đồng bộ dữ liệu khi khởi động", e);
      }
    }
  }

  // Đọc toàn bộ dữ liệu
  getData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_MOCK_DATA;
    } catch (e) {
      console.error("Lỗi parse dữ liệu từ localStorage, sử dụng Mock Data mặc định", e);
      return DEFAULT_MOCK_DATA;
    }
  }

  // Ghi toàn bộ dữ liệu
  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Lỗi ghi dữ liệu vào localStorage', e);
      alert('KHÔNG THỂ LƯU DỮ LIỆU: Bộ nhớ trình duyệt đã đầy hoặc bị chặn.\nHãy dùng chức năng "Sao lưu dữ liệu" để xuất file JSON trước khi thao tác tiếp, tránh mất dữ liệu.');
    }
  }

  // Khôi phục dữ liệu gốc
  reset() {
    this.saveData(DEFAULT_MOCK_DATA);
    // Đồng bộ lại dữ liệu cho toàn bộ các dự án sau khi khôi phục dữ liệu mẫu
    const projects = this.getProjects();
    projects.forEach(p => {
      this.syncProjectTmdt(p.id);
    });
  }

  // --- PROJECT API ---
  getProjects() {
    return this.getData().projects || [];
  }

  getProjectById(id) {
    return this.getProjects().find(p => p.id === id);
  }

  addProject(project) {
    const data = this.getData();
    // Tạo ID tự động tuần tự PROJ-001, PROJ-002...
    let maxSeq = 0;
    data.projects.forEach(p => {
      const match = p.id.match(/^PROJ-(\d{3,4})$/i);
      if (match) {
        maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
      }
    });
    project.id = `PROJ-${String(maxSeq + 1).padStart(3, '0')}`;
    project.code = (project.code || '').trim().toUpperCase();
    project.tmdt = project.tmdt || {
      gpmb: { design: 0, approved: 0, adjusted: 0 },
      construction: { design: 0, approved: 0, adjusted: 0 },
      equipment: { design: 0, approved: 0, adjusted: 0 },
      qlda: { design: 0, approved: 0, adjusted: 0 },
      consulting: { design: 0, approved: 0, adjusted: 0 },
      other: { design: 0, approved: 0, adjusted: 0 },
      contingency: { design: 0, approved: 0, adjusted: 0 }
    };
    project.budgets = project.budgets || [];
    project.bids = project.bids || [];
    project.contracts = project.contracts || [];
    project.payments = project.payments || [];
    project.variations = project.variations || [];
    project.addendums = project.addendums || [];
    project.materials = project.materials || [];
    project.supportDeductions = project.supportDeductions || [];
    project.penaltyDeductions = project.penaltyDeductions || [];
    
    // Tự động khởi tạo 3 mốc tiến độ WBS bắt buộc
    project.milestones = [
      { id: "ms-A", name: "A. Tiến độ đền bù GPMB", planStart: "", planEnd: "", actualStart: "", actualEnd: "", progress: 0, status: "pending" },
      { id: "ms-B", name: "B. Lập báo cáo nghiên cứu khả thi/TMĐT/HQDA", planStart: "", planEnd: "", actualStart: "", actualEnd: "", progress: 0, status: "pending" },
      { id: "ms-C", name: "C. Thiết kế kỹ thuật, thiết kế bản vẽ thi công", planStart: "", planEnd: "", actualStart: "", actualEnd: "", progress: 0, status: "pending" }
    ];
    project.risks = project.risks || [];
    
    data.projects.push(project);
    this.saveData(data);
    return project;
  }

  updateProject(id, updatedFields) {
    const data = this.getData();
    const index = data.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      data.projects[index] = { ...data.projects[index], ...updatedFields };
      this.saveData(data);
      return data.projects[index];
    }
    return null;
  }

  deleteProject(id) {
    const data = this.getData();
    data.projects = data.projects.filter(p => p.id !== id);
    this.saveData(data);
  }

  // Cập nhật TMĐT Matrix của một dự án
  updateProjectTMDT(projectId, tmdtData) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.tmdt = tmdtData;
      this.saveData(data);
      this.syncProjectTmdt(projectId);
      return proj;
    }
    return null;
  }

  // 1. NGÂN SÁCH & TIẾN ĐỘ GÓI THẦU (BUDGETS)
  addBudget(projectId, budget) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      budget.id = 'bg-' + Date.now();
      
      // 1. Tiến độ lựa chọn nhà thầu (mục D)
      budget.bidPlanStart = budget.bidPlanStart || '';
      budget.bidPlanEnd = budget.bidPlanEnd || '';
      budget.bidActualStart = budget.bidActualStart || '';
      budget.bidActualEnd = budget.bidActualEnd || '';
      budget.bidProgress = budget.bidProgress || 0;
      
      // 2. Tiến độ thi công (mục E)
      budget.planStart = budget.planStart || '';
      budget.planEnd = budget.planEnd || '';
      budget.actualStart = budget.actualStart || '';
      budget.actualEnd = budget.actualEnd || '';
      budget.progress = budget.progress || 0;
      
    proj.budgets.push(budget);
    this.saveData(data);
    this.syncProjectTmdt(projectId);
    return budget;
  }
  return null;
}

  updateBudget(projectId, budgetId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.budgets.findIndex(b => b.id === budgetId);
      if (idx !== -1) {
        proj.budgets[idx] = { ...proj.budgets[idx], ...updatedFields };
        this.saveData(data);
        this.syncProjectTmdt(projectId);
        return proj.budgets[idx];
      }
    }
    return null;
  }

  deleteBudget(projectId, budgetId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.budgets = proj.budgets.filter(b => b.id !== budgetId);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
    }
  }

  // 2. ĐẤU THẦU (BIDS)
  addBid(projectId, bid) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      bid.id = 'bid-' + Date.now();
      proj.bids.push(bid);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
      return bid;
    }
    return null;
  }

  updateBid(projectId, bidId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.bids.findIndex(b => b.id === bidId);
      if (idx !== -1) {
        proj.bids[idx] = { ...proj.bids[idx], ...updatedFields };
        this.saveData(data);
        this.syncProjectTmdt(projectId);
        return proj.bids[idx];
      }
    }
    return null;
  }

  deleteBid(projectId, bidId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.bids = proj.bids.filter(b => b.id !== bidId);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
    }
  }

  // 3. HỢP ĐỒNG (CONTRACTS)
  addContract(projectId, contract) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      contract.id = 'ctr-' + Date.now();
      proj.contracts.push(contract);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
      return contract;
    }
    return null;
  }

  updateContract(projectId, contractId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.contracts.findIndex(c => c.id === contractId);
      if (idx !== -1) {
        proj.contracts[idx] = { ...proj.contracts[idx], ...updatedFields };
        this.saveData(data);
        this.syncProjectTmdt(projectId);
        return proj.contracts[idx];
      }
    }
    return null;
  }

  deleteContract(projectId, contractId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.contracts = proj.contracts.filter(c => c.id !== contractId);
      proj.payments = proj.payments.filter(p => p.contractId !== contractId);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
    }
  }

  // 4. THANH TOÁN (PAYMENTS)
  addPayment(projectId, payment) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      payment.id = 'pmt-' + Date.now();
      proj.payments.push(payment);
      this.saveData(data);
      return payment;
    }
    return null;
  }

  updatePayment(projectId, paymentId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.payments.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
        proj.payments[idx] = { ...proj.payments[idx], ...updatedFields };
        this.saveData(data);
        return proj.payments[idx];
      }
    }
    return null;
  }

  deletePayment(projectId, paymentId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.payments = proj.payments.filter(p => p.id !== paymentId);
      this.saveData(data);
    }
  }

  // 5. TIẾN ĐỘ MỐC CHÍNH (MILESTONES)
  addMilestone(projectId, milestone) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      milestone.id = 'ms-' + Date.now();
      proj.milestones.push(milestone);
      this.saveData(data);
      return milestone;
    }
    return null;
  }

  updateMilestone(projectId, milestoneId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.milestones.findIndex(m => m.id === milestoneId);
      if (idx !== -1) {
        proj.milestones[idx] = { ...proj.milestones[idx], ...updatedFields };
        this.saveData(data);
        return proj.milestones[idx];
      }
    }
    return null;
  }

  deleteMilestone(projectId, milestoneId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.milestones = proj.milestones.filter(m => m.id !== milestoneId);
      this.saveData(data);
    }
  }

  // 6. RỦI RO (RISKS)
  addRisk(projectId, risk) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      risk.id = 'rsk-' + Date.now();
      proj.risks.push(risk);
      this.saveData(data);
      return risk;
    }
    return null;
  }

  updateRisk(projectId, riskId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.risks.findIndex(r => r.id === riskId);
      if (idx !== -1) {
        proj.risks[idx] = { ...proj.risks[idx], ...updatedFields };
        this.saveData(data);
        return proj.risks[idx];
      }
    }
    return null;
  }

  deleteRisk(projectId, riskId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.risks = proj.risks.filter(r => r.id !== riskId);
      this.saveData(data);
    }
  }

  // 6b. PHÁT SINH (VARIATIONS)
  addVariation(projectId, variation) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      variation.id = 'var-' + Date.now();
      variation.addendumId = variation.addendumId || null;
      proj.variations.push(variation);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
      return variation;
    }
    return null;
  }

  updateVariation(projectId, variationId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.variations.findIndex(v => v.id === variationId);
      if (idx !== -1) {
        proj.variations[idx] = { ...proj.variations[idx], ...updatedFields };
        this.saveData(data);
        this.syncProjectTmdt(projectId);
        return proj.variations[idx];
      }
    }
    return null;
  }

  deleteVariation(projectId, variationId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.variations = proj.variations.filter(v => v.id !== variationId);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
    }
  }

  // 6c. PHỤ LỤC HỢP ĐỒNG (ADDENDUMS)
  addAddendum(projectId, addendum) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      addendum.id = 'add-' + Date.now();
      proj.addendums.push(addendum);
      
      // Cập nhật lại addendumId cho các phát sinh được gom
      if (addendum.variationIds && addendum.variationIds.length > 0) {
        proj.variations.forEach(v => {
          if (addendum.variationIds.includes(v.id)) {
            v.addendumId = addendum.id;
          }
        });
      }
      
      this.saveData(data);
      this.syncProjectTmdt(projectId);
      return addendum;
    }
    return null;
  }

  updateAddendum(projectId, addendumId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      const idx = proj.addendums.findIndex(a => a.id === addendumId);
      if (idx !== -1) {
        const oldVariationIds = proj.addendums[idx].variationIds || [];
        proj.addendums[idx] = { ...proj.addendums[idx], ...updatedFields };
        
        // Reset addendumId cho các phát sinh cũ
        proj.variations.forEach(v => {
          if (oldVariationIds.includes(v.id)) {
            v.addendumId = null;
          }
        });
        
        // Gán addendumId cho các phát sinh mới
        const newVariationIds = proj.addendums[idx].variationIds || [];
        proj.variations.forEach(v => {
          if (newVariationIds.includes(v.id)) {
            v.addendumId = addendumId;
          }
        });

        this.saveData(data);
        this.syncProjectTmdt(projectId);
        return proj.addendums[idx];
      }
    }
    return null;
  }

  deleteAddendum(projectId, addendumId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      // Tìm addendum để reset addendumId cho các phát sinh liên quan
      const add = proj.addendums.find(a => a.id === addendumId);
      if (add && add.variationIds) {
        proj.variations.forEach(v => {
          if (add.variationIds.includes(v.id)) {
            v.addendumId = null;
          }
        });
      }
      proj.addendums = proj.addendums.filter(a => a.id !== addendumId);
      this.saveData(data);
      this.syncProjectTmdt(projectId);
    }
  }

  // --- MATERIALS API ---
  addMaterial(projectId, material) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.materials = proj.materials || [];
      material.id = 'mat-' + Date.now();
      proj.materials.push(material);
      this.saveData(data);
      return material;
    }
    return null;
  }

  updateMaterial(projectId, materialId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj && proj.materials) {
      const idx = proj.materials.findIndex(m => m.id === materialId);
      if (idx !== -1) {
        proj.materials[idx] = { ...proj.materials[idx], ...updatedFields };
        this.saveData(data);
        return proj.materials[idx];
      }
    }
    return null;
  }

  deleteMaterial(projectId, materialId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj && proj.materials) {
      proj.materials = proj.materials.filter(m => m.id !== materialId);
      this.saveData(data);
    }
  }

  // --- SUPPORT DEDUCTIONS API ---
  addSupportDeduction(projectId, deduction) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj) {
      proj.supportDeductions = proj.supportDeductions || [];
      deduction.id = 'sded-' + Date.now();
      proj.supportDeductions.push(deduction);
      this.saveData(data);
      return deduction;
    }
    return null;
  }

  updateSupportDeduction(projectId, deductionId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj && proj.supportDeductions) {
      const idx = proj.supportDeductions.findIndex(d => d.id === deductionId);
      if (idx !== -1) {
        proj.supportDeductions[idx] = { ...proj.supportDeductions[idx], ...updatedFields };
        this.saveData(data);
        return proj.supportDeductions[idx];
      }
    }
    return null;
  }

  deleteSupportDeduction(projectId, deductionId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj && proj.supportDeductions) {
      proj.supportDeductions = proj.supportDeductions.filter(d => d.id !== deductionId);
      this.saveData(data);
    }
  }

  // --- PENALTY DEDUCTIONS API ---
  addPenaltyDeduction(projectId, dedData) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    console.log('addPenaltyDeduction called. proj found:', !!proj);
    if (proj) {
      if (!proj.penaltyDeductions) proj.penaltyDeductions = [];
      dedData.id = Date.now().toString();
      proj.penaltyDeductions.push(dedData);
      this.saveData(data);
      console.log('Saved penalty data!');
      return dedData;
    }
    return null;
  }

  updatePenaltyDeduction(projectId, deductionId, updatedFields) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj && proj.penaltyDeductions) {
      const idx = proj.penaltyDeductions.findIndex(d => d.id === deductionId);
      if (idx !== -1) {
        proj.penaltyDeductions[idx] = { ...proj.penaltyDeductions[idx], ...updatedFields };
        this.saveData(data);
        return proj.penaltyDeductions[idx];
      }
    }
    return null;
  }

  deletePenaltyDeduction(projectId, deductionId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (proj && proj.penaltyDeductions) {
      proj.penaltyDeductions = proj.penaltyDeductions.filter(d => d.id !== deductionId);
      this.saveData(data);
    }
  }

  // --- OFFICERS API ---
  getOfficers() {
    return this.getData().officers || [];
  }

  addOfficer(officer) {
    const data = this.getData();
    officer.id = 'off-' + Date.now();
    data.officers = data.officers || [];
    data.officers.push(officer);
    this.saveData(data);
    return officer;
  }

  updateOfficer(id, updatedFields) {
    const data = this.getData();
    data.officers = data.officers || [];
    const idx = data.officers.findIndex(o => o.id === id);
    if (idx !== -1) {
      data.officers[idx] = { ...data.officers[idx], ...updatedFields };
      this.saveData(data);
      return data.officers[idx];
    }
    return null;
  }

  deleteOfficer(id) {
    const data = this.getData();
    data.officers = (data.officers || []).filter(o => o.id !== id);
    this.saveData(data);
  }

  // Đồng bộ hóa tự động giá trị TMĐT Phê duyệt & Điều chỉnh thực tế từ Ngân sách & Hợp đồng
  syncProjectTmdt(projectId) {
    const data = this.getData();
    const proj = data.projects.find(p => p.id === projectId);
    if (!proj) return;

    const categories = ['gpmb', 'construction', 'equipment', 'qlda', 'consulting', 'other'];

    categories.forEach(cat => {
      // 1. Tính tổng ngân sách được duyệt cho nhóm chi phí này
      const totalBudget = proj.budgets
        .filter(b => b.category === cat)
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      // 2. Tính tổng giá trị hợp đồng đã ký cho các gói thầu thuộc nhóm chi phí này (bao gồm cả PLHĐ)
      let totalSigned = 0;
      proj.budgets.forEach(b => {
        if (b.category === cat) {
          const linkedBids = proj.bids.filter(bid => bid.budgetId === b.id);
          const linkedBidIds = linkedBids.map(bid => bid.id);
          const linkedContracts = proj.contracts.filter(c => 
            linkedBidIds.includes(c.bidId) && 
            (c.status === 'active' || c.status === 'liquidated')
          );
          linkedContracts.forEach(c => {
            const baseValue = c.value || 0;
            // Cộng thêm giá trị các phụ lục hợp đồng đã active
            const addendumsValue = proj.addendums
              ? proj.addendums.filter(a => a.contractId === c.id && a.status === 'active').reduce((sum, a) => sum + (a.value || 0), 0)
              : 0;
            totalSigned += (baseValue + addendumsValue);
          });
        }
      });

      if (!proj.tmdt[cat]) {
        proj.tmdt[cat] = { design: 0, approved: 0, adjusted: 0 };
      }
      proj.tmdt[cat].approved = totalBudget;
      proj.tmdt[cat].adjusted = totalSigned;
    });

    // Lưu lại dữ liệu sau khi đồng bộ
    this.saveData(data);
  }
}

// Khởi tạo thực thể DB toàn cục
window.db = new ProjectCostsDB();
console.log("Database updated. Mock projects initialized:", window.db.getProjects().length);
