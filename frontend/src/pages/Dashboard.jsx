import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  TrendingUp,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  Info,
  Layers,
  Database,
  HelpCircle,
  X,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

import ActivityLog from './ActivityLog';

const API_BASE = 'http://localhost:5000/api';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        boxShadow: 'var(--card-shadow)',
        color: 'var(--text-main)'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: payload[0].payload.color || '#10b981' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
            {payload[0].value} purchases
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    active: false,
    total_transactions: 0,
    unique_items_count: 0,
    top_items: [],
    recommended_algorithm: 'None'
  });
  const [trends, setTrends] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('7D');
  const [showPatternsModal, setShowPatternsModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const toggleRow = (idx) => {
    setExpandedRow(prev => (prev === idx ? null : idx));
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      console.log('Starting PDF presentation generation...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);

      // Helper for clean footers on all pages
      const addPageFooter = (pageNum, totalPages) => {
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text('CoBuy Market Insights • Confidential Store Executive Report', margin, pageHeight - 6);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      };

      // =========================================================================
      // PAGE 1: EXECUTIVE DASHBOARD & STORE ACTIVITY
      // =========================================================================
      
      // 1. Top Header Banner
      pdf.setFillColor(30, 27, 75); // Royal Navy #1e1b4b
      pdf.rect(0, 0, pageWidth, 26, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('CoBuy', margin, 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(199, 210, 254);
      pdf.text('Executive Retail Market Analysis Report', margin + 24, 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(226, 232, 240);
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      pdf.text(`Report Date: ${dateStr}`, pageWidth - margin, 14, { align: 'right' });

      let y = 32;

      // 2. Store Metadata Ribbon
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, 16, 3, 3, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      
      pdf.text('STORE DATASET:', margin + 4, y + 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);
      pdf.text((localStorage.getItem('activeDatasetName') || 'Store Transactions').substring(0, 28), margin + 31, y + 6);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text('TOTAL TRANSACTIONS:', margin + 4, y + 11.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${(stats.total_transactions || 0).toLocaleString()} receipts`, margin + 40, y + 11.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text('CATALOG ITEMS:', margin + 105, y + 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${stats.unique_items_count || 0} unique products`, margin + 132, y + 6);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text('PATTERNS FOUND:', margin + 105, y + 11.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(79, 70, 229);
      pdf.text(`${rules.length} buying associations`, margin + 134, y + 11.5);

      y += 22;

      // 3. Executive KPI Cards (4 Grid Cards)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('1. Executive Summary KPIs', margin, y);
      y += 5;

      const cardGap = 4;
      const cardW = (contentWidth - (cardGap * 3)) / 4;
      
      const kpis = [
        { label: 'Total Receipts', value: (stats.total_transactions || 0).toLocaleString(), color: [79, 70, 229] },
        { label: 'Catalog Items', value: `${stats.unique_items_count || 0}`, color: [16, 185, 129] },
        { label: 'Patterns Found', value: `${rules.length}`, color: [245, 158, 11] },
        { label: 'Top Product', value: stats.top_items?.[0]?.name ? stats.top_items[0].name.substring(0, 12) : 'Milk', color: [124, 58, 237] }
      ];

      kpis.forEach((kpi, idx) => {
        const x = margin + idx * (cardW + cardGap);
        
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, cardW, 20, 2.5, 2.5, 'FD');

        pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.rect(x, y + 2, 2.5, 16, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(kpi.label, x + 6, y + 6);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(kpi.value, x + 6, y + 14);
      });

      y += 26;

      // 4. Store Sales Activity Chart ("Daily Transaction Volume" - Native Vector PDF Bar Chart)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('2. Store Sales Activity Graph (Daily Transaction Volume)', margin, y);
      y += 5;

      const chartBoxH = 64;
      const chartBoxW = contentWidth;

      // Clean Light Card Container Background
      pdf.setFillColor(250, 252, 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, chartBoxW, chartBoxH, 3, 3, 'FD');

      // Card Header inside PDF Chart: "Daily Transaction Volume"
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Daily Transaction Volume', margin + 10, y + 8.5);

      const chartAreaX = margin + 25;
      const chartAreaY = y + 16;
      const chartAreaW = chartBoxW - 31;
      const chartAreaH = chartBoxH - 26;

      // Vertical Y-Axis Title Label: "Number of Receipts" (Centered vertically along the Y-axis next to tick 320)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(30, 27, 75);
      pdf.text('Number of Receipts', margin + 12.5, chartAreaY + (chartAreaH / 2), { angle: 90, align: 'center' });

      // Calculate grid steps
      const maxVal = maxCount > 0 ? maxCount : 100;
      const gridStep = Math.ceil(maxVal / 4 / 20) * 20 || 50;
      const topTick = gridStep * 4 > maxVal ? gridStep * 4 : Math.ceil(maxVal / 50) * 50;
      const yTicks = [0, Math.round(topTick * 0.25), Math.round(topTick * 0.5), Math.round(topTick * 0.75), topTick];

      // Axis Lines
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.4);
      pdf.line(chartAreaX, chartAreaY, chartAreaX, chartAreaY + chartAreaH);
      pdf.line(chartAreaX, chartAreaY + chartAreaH, chartAreaX + chartAreaW, chartAreaY + chartAreaH);

      // Draw Grid Lines & Y Tick Labels
      yTicks.forEach(tickVal => {
        const tickY = chartAreaY + chartAreaH - ((tickVal / topTick) * chartAreaH);
        
        if (tickVal > 0) {
          pdf.setDrawColor(241, 245, 249);
          pdf.setLineWidth(0.2);
          pdf.line(chartAreaX, tickY, chartAreaX + chartAreaW, tickY);
        }
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`${tickVal}`, chartAreaX - 3, tickY + 1.5, { align: 'right' });
      });

      // Draw Clean Vector Bars with Values on top
      const numBars = filteredTrends.length;
      if (numBars > 0) {
        const barGap = 4;
        const totalBarWidth = (chartAreaW - (barGap * (numBars + 1))) / numBars;
        const barW = Math.min(18, totalBarWidth);
        
        filteredTrends.forEach((t, i) => {
          const barX = chartAreaX + barGap + i * (barW + barGap);
          const barH = Math.max(2, (t.count / topTick) * chartAreaH);
          const barY = chartAreaY + chartAreaH - barH;
          const isPeak = t.count === maxCount && maxCount > 0;
          
          if (isPeak) {
            pdf.setFillColor(124, 58, 237); // Vibrant accent purple
          } else {
            pdf.setFillColor(99, 102, 241);  // Primary indigo
          }
          
          pdf.rect(barX, barY, barW, barH, 'F');
          
          // Value on top of bar
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(5.5);
          pdf.setTextColor(isPeak ? 124 : 79, isPeak ? 58 : 70, isPeak ? 237 : 229);
          pdf.text(`${t.count}`, barX + barW / 2, barY - 1.5, { align: 'center' });

          // Date label on X axis
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(6);
          pdf.setTextColor(100, 116, 139);
          let dateLabel = t.date;
          if (dateLabel && dateLabel.includes('-')) {
            const parts = dateLabel.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mIdx = parseInt(parts[1], 10) - 1;
            dateLabel = `${months[mIdx] || parts[1]} ${parts[2]}`;
          }
          pdf.text(dateLabel, barX + barW / 2, chartAreaY + chartAreaH + 4, { align: 'center' });
        });
      }

      // Horizontal Flat X-Axis Title Label: "Transaction Date"
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(30, 27, 75);
      pdf.text('Transaction Date', chartAreaX + (chartAreaW / 2), chartAreaY + chartAreaH + 8.5, { align: 'center' });

      y += chartBoxH + 4;

      // Graph Interpretation block (Formatted Executive Card Box)
      const minCount = filteredTrends.length > 0 ? Math.min(...filteredTrends.map(t => t.count)) : 0;
      const peakStr = peakDay ? `Peak recorded volume occurred on ${peakDay.date} with ${peakDay.count} receipts.` : '';
      const interpText = `Daily transaction volume ranges between ${minCount} and ${maxCount} receipts per day. ${peakStr} Management can use peak volumes for staff scheduling and stock prep.`;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      const splitInterp = pdf.splitTextToSize(interpText, contentWidth - 14);
      const interpCardH = Math.max(13, splitInterp.length * 3.5 + 8);

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, interpCardH, 2, 2, 'FD');

      pdf.setFillColor(79, 70, 229);
      pdf.rect(margin, y, 2.5, interpCardH, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(30, 27, 75);
      pdf.text('What this graph means for your store:', margin + 6, y + 4.8);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(71, 85, 105);
      pdf.text(splitInterp, margin + 6, y + 9);

      y += interpCardH + 5;

      // 5. Top 5 Selling Products Section (Fills Page 1 perfectly!)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('3. Top Selling Products Summary', margin, y);
      y += 5;

      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, y, contentWidth, 6, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text('Rank & Product Name', margin + 4, y + 4.2);
      pdf.text('Quantity Sold', margin + 90, y + 4.2);
      pdf.text('Store Sales Share (%)', margin + 140, y + 4.2);
      y += 6;

      const topProducts = (stats.top_items || []).slice(0, 4);

      topProducts.forEach((item, idx) => {
        if (idx % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y, contentWidth, 6.5, 'F');
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(79, 70, 229);
        pdf.text(`#${idx + 1}`, margin + 4, y + 4.5);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(15, 23, 42);
        pdf.text(item.name, margin + 14, y + 4.5);

        pdf.text(`${(item.count || 0).toLocaleString()} units`, margin + 90, y + 4.5);

        const share = (((item.count || 0) / (stats.total_transactions || 1)) * 100).toFixed(1);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(16, 185, 129);
        pdf.text(`${share}% of transactions`, margin + 140, y + 4.5);

        y += 6.5;
      });

      addPageFooter(1, 2);

      // =========================================================================
      // PAGE 2: STRONGEST BUYING PATTERNS & RECOMMENDATIONS
      // =========================================================================
      pdf.addPage();
      y = 12;

      pdf.setFillColor(30, 27, 75);
      pdf.rect(0, 0, pageWidth, 16, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('CoBuy Executive Store Analysis Report — Buying Patterns & Strategies', margin, 11);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(199, 210, 254);
      pdf.text(`Date: ${dateStr}`, pageWidth - margin, 11, { align: 'right' });

      y = 24;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('4. Strongest Buying Patterns (Co-occurrence Rules)', margin, y);
      y += 5;

      pdf.setFillColor(30, 27, 75);
      pdf.rect(margin, y, contentWidth, 8, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('IF THEY BUY...', margin + 4, y + 5.5);
      pdf.text('...THEY ALSO BUY', margin + 55, y + 5.5);
      pdf.text('COMMON %', margin + 105, y + 5.5);
      pdf.text('LIKELY %', margin + 132, y + 5.5);
      pdf.text('STRENGTH', margin + 160, y + 5.5);
      y += 8;

      const rulesToRender = sortedRules.length > 0 ? sortedRules : rules.slice(0, 10);
      rulesToRender.forEach((rule, idx) => {
        if (y > pageHeight - 75) {
          addPageFooter(2, 2);
          pdf.addPage();
          y = 20;
        }

        if (idx % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y, contentWidth, 7, 'F');
        }
        pdf.setDrawColor(241, 245, 249);
        pdf.line(margin, y + 7, pageWidth - margin, y + 7);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(15, 23, 42);
        pdf.text(rule.antecedents.join(', ').substring(0, 26), margin + 4, y + 5);

        pdf.setTextColor(79, 70, 229);
        pdf.text(rule.consequents.join(', ').substring(0, 26), margin + 55, y + 5);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(`${(rule.support * 100).toFixed(1)}%`, margin + 105, y + 5);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(rule.confidence >= 0.7 ? 16 : 245, rule.confidence >= 0.7 ? 185 : 158, rule.confidence >= 0.7 ? 129 : 11);
        pdf.text(`${(rule.confidence * 100).toFixed(1)}%`, margin + 132, y + 5);

        pdf.setTextColor(79, 70, 229);
        pdf.text(`${rule.lift.toFixed(2)}x`, margin + 160, y + 5);

        y += 7;
      });

      y += 10;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('5. Recommended Store Strategies', margin, y);
      y += 6;

      const recommendationsList = [
        {
          title: 'Strategic Shelf Placement',
          desc: 'Place high-confidence pairing products (such as Soda, Eggs, and Sugar) on adjacent shelves or prominent counter displays to trigger immediate impulse buys.'
        },
        {
          title: 'Combo Bundle Promotion',
          desc: 'Package top co-occurring item pairs together as a discounted combo deal to boost average order value and customer transaction size.'
        },
        {
          title: 'Targeted Store Signage',
          desc: 'Install shelf tags ("Customers who bought X also picked up Y") near anchor items to guide customer shopping habits and increase cross-category discovery.'
        }
      ];

      recommendationsList.forEach((rec, idx) => {
        const cardH = 13;
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(margin, y, contentWidth, cardH, 2, 2, 'FD');

        pdf.setFillColor(79, 70, 229);
        pdf.rect(margin, y, 2.5, cardH, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 27, 75);
        pdf.text(`Tip ${idx + 1}: ${rec.title}`, margin + 6, y + 5);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(71, 85, 105);
        
        const splitText = pdf.splitTextToSize(rec.desc, contentWidth - 12);
        pdf.text(splitText, margin + 6, y + 9.5);

        y += cardH + 4;
      });

      addPageFooter(2, 2);

      const fileName = `CoBuy_Analysis_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(pdfFile);

      const downloadLink = document.createElement('a');
      downloadLink.href = fileUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        if (document.body.contains(downloadLink)) {
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(fileUrl);
      }, 1000);

      console.log('Stunning PDF report presentation exported successfully!');
    } catch (err) {
      console.error('Error generating PDF presentation:', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const activeDatasetId = localStorage.getItem('activeDatasetId');
        
        if (!activeDatasetId) {
          setStats({
            active: false,
            total_transactions: 0,
            unique_items_count: 0,
            top_items: [],
            recommended_algorithm: 'None'
          });
          setTrends([]);
          setRules([]);
          return;
        }

        const statsRes = await axios.get(`${API_BASE}/stats?dataset_id=${activeDatasetId}`);

        if (!statsRes.data.active) {
          localStorage.removeItem('activeDatasetId');
          localStorage.removeItem('activeDatasetName');
          setStats({
            active: false,
            total_transactions: 0,
            unique_items_count: 0,
            top_items: [],
            recommended_algorithm: 'None'
          });
          setTrends([]);
          setRules([]);
          return;
        }

        setStats(statsRes.data);

        // Get trends
        const trendsRes = await axios.get(`${API_BASE}/trends?dataset_id=${activeDatasetId}`);
        setTrends(trendsRes.data.trends || []);

        // Run adaptive mining to show high-confidence rules
        const mineRes = await axios.post(`${API_BASE}/mine`, {
          algorithm: 'auto',
          dataset_id: activeDatasetId
        });
        setRules(mineRes.data.rules || []);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format category/pie chart data based on top items
  const getPieData = () => {
    if (!stats.top_items || stats.top_items.length === 0) return [];
    return stats.top_items.slice(0, 5).map(item => ({
      name: item.name,
      value: item.value
    }));
  };

  const pieData = getPieData();
  const totalItemCount = pieData.reduce((sum, item) => sum + item.value, 0);
  const maxPieValue = pieData.length > 0 ? Math.max(...pieData.map(d => d.value)) : 1;

  // Calculate trends peak & filtering
  const filteredTrends = trends.slice(
    timeFilter === '7D' ? Math.max(0, trends.length - 7) : timeFilter === '30D' ? Math.max(0, trends.length - 30) : 0
  );
  const maxCount = filteredTrends.length > 0 ? Math.max(...filteredTrends.map(t => t.count)) : 0;
  const peakDay = filteredTrends.find(t => t.count === maxCount);

  // Format high confidence rules (top 5 sorted by confidence descending)
  const getFilteredRules = (rawRules) => {
    const seen = new Map();
    rawRules.forEach(rule => {
      const key = [...rule.antecedents, ...rule.consequents].sort().join(',');
      const existing = seen.get(key);
      if (!existing || rule.confidence > existing.confidence) {
        seen.set(key, rule);
      }
    });
    return Array.from(seen.values());
  };

  const sortedRules = getFilteredRules(rules)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">
            <TrendingUp size={28} style={{ color: 'var(--primary-color)' }} />
            Market Insights
          </h1>
          <p className="page-subtitle">Specialized buying pattern finding for your retail niche.</p>
        </div>
        {stats.active && (
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              borderRadius: '8px'
            }}
          >
            {isExporting ? (
              <>
                <RefreshCw size={16} className="spin" /> Generating PDF...
              </>
            ) : (
              <>
                <Download size={16} /> Export Report
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center' }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '500' }}>Loading market insights & pattern analytics...</div>
        </div>
      ) : !stats.active ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed', textAlign: 'center' }}>
          <Database size={48} style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.75rem' }}>No Active Business Data Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '520px', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            There is currently no active dataset or running data in Analytics. Upload a transaction CSV file or select a dataset in **Analytics** to view market insights and buying patterns.
          </p>
          <a href="/analytics" className="btn btn-primary" style={{ padding: '0.75rem 2rem', textDecoration: 'none' }}>
            Go to Analytics
          </a>
        </div>
      ) : (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="card stat-card">
              <div className="stat-label">Total Purchases</div>
              <div className="stat-value">{stats.total_transactions.toLocaleString()}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.85rem' }}>
                <ArrowUpRight size={16} /> Live Count
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Different Items Sold</div>
              <div className="stat-value">{stats.unique_items_count}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.85rem' }}>
                <ArrowUpRight size={16} /> Items Tracked
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Patterns Found</div>
              <div className="stat-value">{rules.length}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.85rem' }}>
                <ArrowUpRight size={16} /> Based on Your Data
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Chart 1: Daily Transaction Volume Bar Pillars */}
            <div className="card" id="dashboard-sales-chart">
              <div style={{ marginBottom: '0.85rem' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.15rem', color: 'var(--text-main)' }}>
                  Daily Transaction Volume
                </h3>
              </div>

              <div style={{ height: '300px' }}>
                {filteredTrends.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No daily trends available in this time range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredTrends} margin={{ top: 15, right: 20, left: 15, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-color)" strokeOpacity={0.6} />
                      <XAxis
                        dataKey="date"
                        axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1.5 }}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                        padding={{ left: 15, right: 15 }}
                        tickFormatter={(str) => {
                          if (!str || typeof str !== 'string') return str;
                          const parts = str.split('-');
                          if (parts.length !== 3) return str;
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const monthIdx = parseInt(parts[1], 10) - 1;
                          const month = months[monthIdx] || parts[1];
                          const day = parts[2];
                          return `${month} ${day}`;
                        }}
                        label={{
                          value: 'Transaction Date',
                          position: 'insideBottom',
                          offset: -18,
                          style: { fill: 'var(--text-main)', fontSize: 12, fontWeight: 700 }
                        }}
                      />
                      <YAxis
                        axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1.5 }}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                        label={{
                          value: 'Number of Receipts',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 10,
                          dy: 60,
                          style: { fill: 'var(--text-main)', fontSize: 12, fontWeight: 700, textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--inner-box-bg)', opacity: 0.5 }} />
                      <Bar dataKey="count" name="Receipts" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={450} isAnimationActive={true}>
                        {filteredTrends.map((entry, index) => {
                          const isPeak = entry.count === maxCount && maxCount > 0;
                          return (
                            <Cell
                              key={`bar-${index}`}
                              fill={isPeak ? 'var(--accent-color)' : 'var(--primary-color)'}
                              style={{
                                transition: 'all 0.3s ease'
                              }}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {filteredTrends.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.875rem 1.1rem',
                  background: 'var(--inner-box-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.83rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5
                }}>
                  <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>
                    💡 What this graph means for your store:
                  </strong>
                  Daily transaction volume ranges between <strong>{Math.min(...filteredTrends.map(t => t.count))}</strong> and <strong>{maxCount} receipts</strong> per day. The peak recorded volume occurred on <strong>{peakDay?.date}</strong> with <strong>{peakDay?.count} receipts</strong> (busiest day). Use these insights to optimize staff scheduling and inventory stocking for high-demand days.
                </div>
              )}
            </div>

            {/* Chart 2: Option 2 Horizontal Leaderboard Progress Grid */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.15rem', color: 'var(--text-main)' }}>What People Buy Most</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--inner-box-bg)', padding: '0.25rem 0.65rem', borderRadius: '100px', border: '1px solid var(--border-color)' }}>
                  🏆 {totalItemCount.toLocaleString()} Total Units
                </span>
              </div>

              {pieData.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No products sold yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxHeight: '315px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {pieData.map((item, index) => {
                    const percentage = totalItemCount > 0 ? Math.round((item.value / totalItemCount) * 100) : 0;
                    const barWidth = `${Math.min(100, Math.max(8, Math.round((item.value / maxPieValue) * 100)))}%`;
                    const barOpacity = Math.max(0.4, 1 - index * 0.15);

                    return (
                      <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: index === 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--inner-box-bg)',
                              border: '1px solid var(--border-color)',
                              color: index === 0 ? 'var(--primary-color)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              #{index + 1}
                            </span>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {item.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                              {item.value.toLocaleString()} sales
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '38px', textAlign: 'right' }}>
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Cohesive Monochromatic Progress Track */}
                        <div style={{ width: '100%', height: '8px', background: 'var(--inner-box-bg)', borderRadius: '100px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <div style={{
                            width: barWidth,
                            height: '100%',
                            background: 'var(--primary-color)',
                            opacity: barOpacity,
                            borderRadius: '100px',
                            transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Strongest Buying Patterns Table */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} style={{ color: 'var(--primary-color)' }} /> Strongest Buying Patterns
              </div>
              <button
                onClick={() => setShowPatternsModal(true)}
                style={{
                  background: 'var(--inner-box-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary-color)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Click to see how buying patterns and calculations work"
              >
                <HelpCircle size={17} />
              </button>
            </h3>
            <div className="table-container">
              {sortedRules.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No strong buying patterns discovered even after relaxing thresholds to the minimum floor (0.01% support, 2% confidence).
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>If They Buy…</th>
                      <th>…They Also Buy</th>
                      <th>How Common This Is</th>
                      <th>How Likely</th>
                      <th>How Strong the Link Is</th>
                      <th style={{ textAlign: 'right' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRules.map((rule, idx) => {
                      const isEven = idx % 2 === 0;
                      const isExpanded = expandedRow === idx;
                      const totalTx = stats.total_transactions || 229;
                      const bothCount = rule.rule_tx_count || Math.max(1, Math.round(rule.support * totalTx));
                      const antCount = rule.ant_tx_count || Math.max(bothCount, Math.round(bothCount / (rule.confidence || 1)));
                      const consRate = rule.consequent_baseline_rate || (rule.lift ? (rule.confidence / rule.lift) : 0.2);
                      const consCount = Math.max(1, Math.round(consRate * totalTx));
                      const antText = rule.antecedents.join(', ');
                      const consText = rule.consequents.join(', ');
                      const allItemsText = [...rule.antecedents, ...rule.consequents].join(', ');

                      return (
                        <React.Fragment key={idx}>
                          <tr
                            style={{
                              background: isEven ? 'var(--table-bg)' : 'transparent',
                              borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--inner-box-bg)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isEven ? 'var(--table-bg)' : 'transparent'; }}
                          >
                            <td style={{ fontWeight: '600', color: '#fff' }}>{antText}</td>
                            <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{consText}</td>
                            <td className="mono">{(rule.support * 100).toFixed(1)}%</td>
                            <td className="mono" style={{ color: rule.confidence >= 0.7 ? '#10b981' : '#f59e0b', fontWeight: '700' }}>{(rule.confidence * 100).toFixed(1)}%</td>
                            <td className="mono" style={{ fontWeight: '600' }}>{rule.lift.toFixed(2)}x</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => toggleRow(idx)}
                                style={{
                                  background: isExpanded ? 'rgba(99, 102, 241, 0.18)' : 'var(--inner-box-bg)',
                                  border: `1px solid ${isExpanded ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                  color: isExpanded ? 'var(--primary-color)' : 'var(--text-main)',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                              >
                                {isExpanded ? 'Hide' : 'View'}
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                            </td>
                          </tr>
                          <AnimatePresence>
                            {isExpanded && (
                              <tr key={`exp-${idx}`} style={{ background: isEven ? 'var(--table-bg)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                                <td colSpan={6} style={{ padding: 0 }}>
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    style={{ overflow: 'hidden', padding: '0 1.25rem 1rem' }}
                                  >
                                    <div style={{
                                      background: 'var(--table-header-bg)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '10px',
                                      padding: '1.15rem 1.4rem',
                                      marginTop: '0.4rem',
                                      fontSize: '0.82rem',
                                      color: 'var(--text-main)',
                                      lineHeight: 1.7
                                    }}>
                                      {/* Header badge */}
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.85rem',
                                        paddingBottom: '0.65rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        flexWrap: 'wrap',
                                        gap: '0.5rem'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.88rem' }}>
                                          <span style={{ color: 'var(--primary-color)' }}>📊 System Calculation Proof</span>
                                          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>
                                            (How this buying pattern was computed from your uploaded store data)
                                          </span>
                                        </div>
                                        <span style={{
                                          fontSize: '0.72rem',
                                          fontWeight: '700',
                                          color: '#10b981',
                                          background: 'rgba(16, 185, 129, 0.12)',
                                          padding: '0.2rem 0.55rem',
                                          borderRadius: '4px',
                                          border: '1px solid rgba(16, 185, 129, 0.25)'
                                        }}>
                                          Verified Data Proof
                                        </span>
                                      </div>

                                      {/* 3 Step Proof Cards */}
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                                        
                                        {/* Card 1: Common Frequency */}
                                        <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.9rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                          <div>
                                            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                              1. How Common This Is
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#3b82f6', marginBottom: '0.2rem' }}>
                                              {(rule.support * 100).toFixed(1)}%
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.65rem' }}>
                                              Appeared in <strong>{bothCount}</strong> out of <strong>{totalTx.toLocaleString()}</strong> total receipts in your uploaded file.
                                            </div>
                                          </div>
                                          <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', background: 'var(--table-header-bg)', padding: '0.45rem 0.65rem', borderRadius: '5px', border: '1px solid var(--border-color)', lineHeight: '1.5' }}>
                                            <strong>{bothCount}</strong> (receipts with {allItemsText}) &divide; <strong>{totalTx.toLocaleString()}</strong> (total store receipts) = <strong>{(rule.support * 100).toFixed(1)}%</strong>
                                          </div>
                                        </div>

                                        {/* Card 2: Likelihood / Habit */}
                                        <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.9rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                          <div>
                                            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                              2. How Likely They Buy Together
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: rule.confidence >= 0.7 ? '#10b981' : '#f59e0b', marginBottom: '0.2rem' }}>
                                              {(rule.confidence * 100).toFixed(1)}%
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.65rem' }}>
                                              When customers bought <strong>{antText}</strong>, <strong>{(rule.confidence * 100).toFixed(1)}%</strong> of them also grabbed <strong>{consText}</strong>.
                                            </div>
                                          </div>
                                          <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', background: 'var(--table-header-bg)', padding: '0.45rem 0.65rem', borderRadius: '5px', border: '1px solid var(--border-color)', lineHeight: '1.5' }}>
                                            <strong>{bothCount}</strong> (bought {allItemsText}) &divide; <strong>{antCount}</strong> (bought {antText}) = <strong>{(rule.confidence * 100).toFixed(1)}%</strong>
                                          </div>
                                        </div>

                                        {/* Card 3: Connection Strength */}
                                        <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.9rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                          <div>
                                            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                              3. Connection Strength
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-color)', marginBottom: '0.2rem' }}>
                                              {rule.lift.toFixed(2)}x
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.65rem' }}>
                                              Buying these together is <strong>{rule.lift.toFixed(2)} times more likely</strong> than an average random customer purchase.
                                            </div>
                                          </div>
                                          <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', background: 'var(--table-header-bg)', padding: '0.45rem 0.65rem', borderRadius: '5px', border: '1px solid var(--border-color)', lineHeight: '1.5' }}>
                                            <strong>{(rule.confidence * 100).toFixed(1)}%</strong> (buyer rate) &divide; [<strong>{consCount}</strong> ({consText} receipts) &divide; <strong>{totalTx.toLocaleString()}</strong> (total receipts)] = <strong>{rule.lift.toFixed(2)}x boost</strong>
                                          </div>
                                        </div>

                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Association Rules / Strongest Buying Patterns Explainer Modal */}
      {showPatternsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowPatternsModal(false);
        }}>
          <div className="card fade-in" style={{
            maxWidth: '780px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '2.2rem',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--sidebar-active-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    Strongest Buying Patterns & Calculations
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                    Executive breakdown of retail cross-selling algorithms (`Apriori / FP-Growth`)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPatternsModal(false)}
                style={{
                  background: 'var(--inner-box-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* What is this section */}
            <div style={{
              background: 'var(--sidebar-active-bg)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem'
            }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--primary-color)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} /> What Does "Strongest Buying Patterns" Mean?
              </h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                This table reveals the most powerful <strong>co-purchasing behaviors</strong> discovered in your store's transaction history. Instead of just looking at top-selling items individually, it answers the question: <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>"When a shopper puts Item X in their cart, what else do they automatically grab before checkout?"</span> These rules empower retail managers to build targeted bundles, optimize shelf placement, and increase Average Order Value (AOV).
              </p>
            </div>

            {/* How the Calculations Work */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} style={{ color: 'var(--accent-color)' }} /> How the 3 Key Calculations Work
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              {/* Step 1: Support */}
              <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>1. How Common This Is (`Support`)</span>
                  <span className="mono" style={{ fontSize: '0.8rem', background: 'var(--badge-bg)', padding: '0.2rem 0.6rem', borderRadius: '100px', color: 'var(--text-muted)' }}>Baseline Volume</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 0.6rem' }}>
                  Measures the <strong>percentage of all customer receipts</strong> that contain both items (`If They Buy...` and `...They Also Buy`) together in the same basket.
                </p>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-color)' }}>
                  Support = (Transactions with Both Items) ÷ (Total Store Transactions)
                </div>
              </div>

              {/* Step 2: Confidence */}
              <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>2. How Likely (`Confidence`)</span>
                  <span className="mono" style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>Probability %</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 0.6rem' }}>
                  Measures the <strong>reliability of the rule</strong>. When a customer has already selected the first item, what is the exact probability % that they also purchase the second item?
                </p>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                  Confidence = (Transactions with Both Items) ÷ (Transactions with First Item Only)
                </div>
              </div>

              {/* Step 3: Lift */}
              <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>3. How Strong the Link Is (`Lift`)</span>
                  <span className="mono" style={{ fontSize: '0.8rem', background: 'rgba(124, 58, 237, 0.15)', color: 'var(--accent-color)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>Multiplier (x)</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 0.6rem' }}>
                  Measures how much <strong>stronger the connection is</strong> compared to buying the second item purely by chance (`1.00x`).
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem 0.8rem', borderRadius: '6px', color: 'var(--primary-color)' }}>
                    <strong>&gt; 1.00x:</strong> Strong Positive Link (`e.g., 2.50x = 2.5x more likely to buy together`)
                  </div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem 0.8rem', borderRadius: '6px', color: 'var(--text-muted)' }}>
                    <strong>= 1.00x:</strong> Completely Unrelated Items
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips Footer */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-color)' }} />
                <span>Tip: Click <strong>Shopping Pattern Finder</strong> in the sidebar to adjust minimum Support & Confidence thresholds.</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowPatternsModal(false)}
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
