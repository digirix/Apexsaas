// Template for compact filters to apply across all reports
        {/* Ultra-Compact Single Row Filters */}
        <Card className="bg-gray-50/50">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <Filter className="w-3 h-3" />
                Filters:
              </div>
              {/* Filters go here with h-6 w-20 text-xs styling */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilters(/* reset object */)}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>