import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Filter, ChevronRight } from "lucide-react";
import {
  useListStudents,
  getListStudentsQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/auth";

const BRANCHES = ["All", "CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];
const YEARS = ["All", "1st", "2nd", "3rd", "4th"];
const INTERESTS = ["All", "Placement", "Startup", "Higher Studies", "Other"];

export default function AdminStudents() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("All");
  const [year, setYear] = useState("All");
  const [interest, setInterest] = useState("All");

  const params = {
    ...(search ? { search } : {}),
    ...(branch !== "All" ? { branch } : {}),
    ...(year !== "All" ? { year } : {}),
    ...(interest !== "All" ? { interestArea: interest } : {}),
  };

  const { data: students, isLoading } = useListStudents(params, {
    query: { queryKey: getListStudentsQueryKey(params), enabled: !!getToken() },
  });

  const interestColors: Record<string, string> = {
    Placement: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    Startup: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    "Higher Studies": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    Other: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Students</h2>
          <p className="text-muted-foreground mt-1">
            {students ? `${students.length} student${students.length !== 1 ? "s" : ""} found` : "Loading..."}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-36" data-testid="filter-branch">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b === "All" ? "All Branches" : b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32" data-testid="filter-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>{y === "All" ? "All Years" : `${y} Year`}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={interest} onValueChange={setInterest}>
            <SelectTrigger className="w-40" data-testid="filter-interest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERESTS.map((i) => <SelectItem key={i} value={i}>{i === "All" ? "All Interests" : i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Student list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="p-4 h-16 animate-pulse bg-muted/30" />
              </Card>
            ))}
          </div>
        ) : students && students.length > 0 ? (
          <div className="space-y-2">
            {students.map((student) => (
              <Card
                key={student.id}
                className="border-card-border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setLocation(`/admin/students/${student.id}`)}
                data-testid={`card-student-${student.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {(student.fullName ?? student.name).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate" data-testid={`text-name-${student.id}`}>
                          {student.fullName ?? student.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        {student.branch && (
                          <Badge variant="secondary" className="text-xs">{student.branch}</Badge>
                        )}
                        {student.year && (
                          <Badge variant="outline" className="text-xs">{student.year}</Badge>
                        )}
                        {student.interestArea && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${interestColors[student.interestArea] ?? interestColors.Other}`}>
                            {student.interestArea}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-card-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No students found matching the criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
