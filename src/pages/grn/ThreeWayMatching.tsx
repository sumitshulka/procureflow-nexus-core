import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThreeWayMatchResults, useMatchingSettings } from '@/hooks/useGRN';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, CheckCircle, AlertTriangle, XCircle, Eye, 
  FileText, Loader2, TrendingUp, TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import type { ThreeWayMatchResult } from '@/types/grn';

const ThreeWayMatching = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: matchResults = [], isLoading } = useThreeWayMatchResults();
  const { data: settings } = useMatchingSettings();

  const results = Array.isArray(matchResults) ? matchResults : [];

  const getMatchStatus = (result: ThreeWayMatchResult) => {
    const tolerance = settings?.total_tolerance_percentage || 2;
    
    // Check if has GRN linked
    if (result.linked_grn_count === 0) {
      return { status: 'no_grn', label: 'No GRN', color: 'bg-gray-100 text-gray-800' };
    }

    // Check variance percentages
    const poVarianceAbs = Math.abs(result.po_variance_percent);
    const grnVarianceAbs = Math.abs(result.grn_variance_percent);

    if (poVarianceAbs <= tolerance && grnVarianceAbs <= tolerance) {
      return { status: 'matched', label: 'Matched', color: 'bg-green-100 text-green-800' };
    } else if (poVarianceAbs <= tolerance * 2 && grnVarianceAbs <= tolerance * 2) {
      return { status: 'within_tolerance', label: 'Within Tolerance', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { status: 'mismatch', label: 'Mismatch', color: 'bg-red-100 text-red-800' };
    }
  };

  const filteredResults = results.filter((result: ThreeWayMatchResult) => {
    if (statusFilter === 'all') return true;
    return getMatchStatus(result).status === statusFilter;
  });

  const stats = {
    total: results.length,
    matched: results.filter((r: ThreeWayMatchResult) => getMatchStatus(r).status === 'matched').length,
    withinTolerance: results.filter((r: ThreeWayMatchResult) => getMatchStatus(r).status === 'within_tolerance').length,
    mismatch: results.filter((r: ThreeWayMatchResult) => getMatchStatus(r).status === 'mismatch').length,
    noGrn: results.filter((r: ThreeWayMatchResult) => getMatchStatus(r).status === 'no_grn').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="3-Way Matching"
          description="PO - GRN - Invoice reconciliation and matching"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Within Tolerance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withinTolerance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Mismatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.mismatch}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No GRN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.noGrn}</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Info */}
      {settings && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">
                  Matching Mode: 
                  <Badge variant="outline" className="ml-2">
                    {settings.strict_matching_mode ? 'Strict' : 'Flexible'}
                  </Badge>
                </span>
                <span className="text-muted-foreground">
                  Price Tolerance: <strong>{settings.price_tolerance_percentage}%</strong>
                </span>
                <span className="text-muted-foreground">
                  Total Tolerance: <strong>{settings.total_tolerance_percentage}%</strong>
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                Configure Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="within_tolerance">Within Tolerance</SelectItem>
              <SelectItem value="mismatch">Mismatch</SelectItem>
              <SelectItem value="no_grn">No GRN</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead className="text-right">PO Amount</TableHead>
                  <TableHead className="text-right">GRN Value</TableHead>
                  <TableHead className="text-right">Invoice Amount</TableHead>
                  <TableHead className="text-center">GRN Count</TableHead>
                  <TableHead className="text-right">PO Variance</TableHead>
                  <TableHead className="text-right">GRN Variance</TableHead>
                  <TableHead>Match Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result: ThreeWayMatchResult) => {
                  const matchStatus = getMatchStatus(result);
                  return (
                    <TableRow key={result.invoice_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {result.invoice_number}
                        </div>
                      </TableCell>
                      <TableCell>{result.po_number}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(result.po_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {result.linked_grn_count > 0 
                          ? formatCurrency(result.grn_value)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(result.invoice_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{result.linked_grn_count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 ${
                          result.po_variance > 0 ? 'text-red-600' : result.po_variance < 0 ? 'text-orange-500' : ''
                        }`}>
                          {result.po_variance > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : result.po_variance < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          {result.po_variance >= 0 ? '+' : ''}{result.po_variance_percent.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {result.linked_grn_count > 0 ? (
                          <div className={`flex items-center justify-end gap-1 ${
                            result.grn_variance > 0 ? 'text-red-600' : result.grn_variance < 0 ? 'text-orange-500' : ''
                          }`}>
                            {result.grn_variance > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : result.grn_variance < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {result.grn_variance >= 0 ? '+' : ''}{result.grn_variance_percent.toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={matchStatus.color}>
                          {matchStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/invoices/${result.invoice_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No matching results found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreeWayMatching;
